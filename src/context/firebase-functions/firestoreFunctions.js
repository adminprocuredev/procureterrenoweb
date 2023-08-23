// ** Firebase Imports
import { Firebase, app, db } from 'src/configs/firebase'
import {
  collection,
  doc,
  addDoc,
  setDoc,
  Timestamp,
  query,
  getDoc,
  getDocs,
  updateDoc,
  where,
  orderBy,
  limit,
  runTransaction
} from 'firebase/firestore'

// ** Imports Propios
import { solicitudValidator } from '../form-validation/helperSolicitudValidator'
import { sendEmailNewPetition } from './mailing/sendEmailNewPetition'
import { sendEmailWhenReviewDocs } from './mailing/sendEmailWhenReviewDocs'
import { getUnixTime } from 'date-fns'
import { de } from 'date-fns/locale'

// ** Librería para manejar fechas
const moment = require('moment')

// ** Escribe documentos en Firestore Database
const newDoc = async (values, userParam) => {
  solicitudValidator(values)
  const user = Firebase.auth().currentUser
  if (user !== null) {
    try {
      // Aquí 'counters' es una colección y 'requestCounter' es un documento específico en esa colección
      const counterRef = doc(db, 'counters', 'requestCounter')

      // requestNumber hará una 'Transaccion' para asegurarse de que no existe otro 'n_request' igual. Para ello existirá un contador en 'counters/requestCounter'
      const requestNumber = await runTransaction(db, async transaction => {
        // Se hace la transacción con el documento 'requestCounter'
        const counterSnapshot = await transaction.get(counterRef)

        // Se inicializa la variable newCounter, que será tipo number, que será el contador de solicitudes almacenado en 'counters/requestCounter'
        let newCounter

        // Si el documento 'requestCounter' no existe, se inicializa en 1, de lo contrario se incrementa en 1
        if (!counterSnapshot.exists) {
          newCounter = 1
        } else {
          newCounter = counterSnapshot.data().counter + 1
        }

        // Se almacena en 'counters/requestCounter' el número actual del contador
        transaction.set(counterRef, { counter: newCounter })

        return newCounter
      })

      const docRef = await addDoc(collection(db, 'solicitudes'), {
        title: values.title,
        start: values.start,
        plant: values.plant,
        area: values.area,
        contop: values.contop,
        fnlocation: values.fnlocation,
        petitioner: values.petitioner,
        opshift: values.opshift,
        type: values.type,
        detention: values.detention,
        sap: values.sap,
        objective: values.objective,
        deliverable: values.deliverable,
        receiver: values.receiver,
        description: values.description,
        uid: user.uid,
        user: user.displayName,
        userEmail: user.email,
        userRole: userParam.role,
        date: Timestamp.fromDate(new Date()),
        n_request: requestNumber,
        engineering: userParam.engineering
      })

      // Establecemos los campos adicionales de la solicitud
      await updateDoc(docRef, {
        ...newDoc,
        state: userParam.role || 'no definido'
      })

      // Se envia email a quienes corresponda
      await sendEmailNewPetition(userParam, values, docRef.id, requestNumber)

      console.log('Nueva solicitud creada con éxito.')

      return docRef
    } catch (error) {
      console.error('Error al crear la nueva solicitud:', error)
      throw error
    }
  }
}

const getDocumentAndUser = async id => {
  const ref = doc(db, 'solicitudes', id)
  const querySnapshot = await getDoc(ref)
  const docSnapshot = querySnapshot.data()
  const userRef = doc(db, 'users', docSnapshot.uid)
  const userQuerySnapshot = await getDoc(userRef)
  const previousRole = userQuerySnapshot.data().role - 1

  return { ref, docSnapshot, previousRole }
}

const getLatestEvent = async id => {
  const eventQuery = query(collection(db, `solicitudes/${id}/events`), orderBy('date', 'desc'), limit(1))
  const eventQuerySnapshot = await getDocs(eventQuery)
  const latestEvent = eventQuerySnapshot.docs.length > 0 ? eventQuerySnapshot.docs[0].data() : false

  return latestEvent
}

const setSupervisorShift = async week => {
  const supervisorShift = week % 2 === 0 ? 'A' : 'B'

  return supervisorShift
}

async function increaseAndGetNewOTValue() {
  const counterRef = doc(db, 'counters', 'otCounter')

  try {
    const newOTValue = await runTransaction(db, async transaction => {
      const counterSnapshot = await transaction.get(counterRef)

      const newCounter = counterSnapshot.exists ? counterSnapshot.data().counter + 1 : 1

      transaction.set(counterRef, { counter: newCounter })

      return newCounter
    })

    return newOTValue
  } catch (error) {
    console.error('Error:', error)
    throw error
  }
}

const processFieldChanges = (incomingFields, currentDoc) => {
  const changedFields = {}

  for (const key in incomingFields) {
    let value = incomingFields[key]
    let currentFieldValue = currentDoc[key]

    console.log(value)
    console.log(currentFieldValue)

    if (key === 'start' || key === 'end') {
      value = moment(value.toDate()).toDate().getTime()
      currentFieldValue = currentFieldValue && currentFieldValue.toDate().getTime()
    }

    if (!currentFieldValue || value !== currentFieldValue) {
      // Verifica si el valor ha cambiado o es nuevo y lo guarda
      if (key === 'start' || key === 'end') {
        value = value && Timestamp.fromDate(moment(value).toDate())
        currentFieldValue = currentFieldValue && Timestamp.fromDate(moment(currentFieldValue).toDate())
      }
      changedFields[key] = value
      incomingFields[key] = currentFieldValue || 'none'
    }
  }

  return { changedFields, incomingFields }
}

const updateDocumentAndAddEvent = async (ref, changedFields, userParam, newEvent, requesterId, id) => {
  if (Object.keys(changedFields).length > 0) {
    await updateDoc(ref, changedFields)
    await addDoc(collection(db, 'solicitudes', id, 'events'), newEvent)
    await sendEmailWhenReviewDocs(userParam, newEvent.prevState, newEvent.newState, requesterId, id)
  } else {
    console.log('No se escribió ningún documento')
  }
}

function getNextState(role, approves, latestEvent) {
  const state = {
    returnedPetitioner: 0,
    returnedContOp: 1,
    contOwner: 4,
    planner: 5,
    contAdmin: 6,
    supervisor: 7,
    draftsman: 8,
    rejected: 10
  }

  // Cambiar la función para que reciba el docSnapshot y compare la fecha original de start con la que estoy modificándolo ahora
  // Si quiero cambiarla por la fecha original, no se devolverá al autor, sino que se va por el caso x default.
  const dateHasChanged = latestEvent && 'prevDoc' in latestEvent && 'start' in latestEvent.prevDoc
  const approveWithChanges = typeof approves === 'object' || typeof approves === 'string'
  const approvedByPlanner = latestEvent.prevState === state.planner
  const returnedPetitioner = latestEvent.newState === state.returnedPetitioner
  const returnedContOp = latestEvent.newState === state.returnedContOp
  const devolutionState = state.returnedPetitioner


  const rules = new Map([
    [
      2,
      [
        // Si es devuelta x Procure al solicitante y éste acepta, pasa a supervisor (revisada por admin contrato 5 --> 0 --> 6)
        // No se usó dateHasChanged porque el cambio podría haber pasado en el penúltimo evento
        {
          condition: approves && approvedByPlanner && returnedPetitioner,
          newState: state.contAdmin,
          log: 'Devuelto por Adm Contrato Procure'
        },

        // Si es devuelta al solicitante por cambio de fecha x Cont Operator, pasa a planificador (2/3 --> 0 --> 4)
        {
          condition: approves && dateHasChanged && returnedPetitioner,
          newState: state.contOwner,
          log: 'Devuelto por Cont Operator/Cont Owner MEL'
        }
      ]
    ],
    [
      3,
      [
        // Si aprueba y viene con estado 5 lo pasa a 6 (5 --> 1 --> 6)
        {
          condition: approves && approvedByPlanner && returnedContOp,
          newState: state.contAdmin,
          log: 'Devuelto por Adm Contrato Procure'
        },

        // Si aprueba y viene con otro estado, pasa al planificador (revisada por contract owner) (3 --> 1 --> 4)
        {
          condition: approves && !approvedByPlanner && returnedContOp,
          newState: state.contOwner,
          log: 'Devuelto por Cont Owner MEL'
        }
      ]
    ],
    [
      4,
      [
        // Si modifica, se le devuelve al autor (3 --> 0/1)
        {
          condition: approveWithChanges,
          newState: devolutionState,
          log: 'Aprobado por Planificador'
        }
      ]
    ],
    [
      6,
      [
        // Planificador modifica, Adm Contrato no modifica
        {
          condition: approves && !approveWithChanges && dateHasChanged,
          newState: devolutionState,
          log: 'Aprobada con cambio de fecha'
        },

        // Planificador no modifica, Adm Contrato sí
        {
          condition: approves && approveWithChanges && !dateHasChanged,
          newState: devolutionState,
          log: 'Modificado por adm contrato'
        },

        // Planificador modifica, Adm Contrato sí modifica
        {
          condition: approves && approveWithChanges && dateHasChanged,
          newState: devolutionState,
          log: 'Modificado por adm contrato y planificador'
        }
      ]
    ],
    [
      7,
      [
        // Supervisor devuelve solicitud (6 --> 0/1)
        { condition: typeof approves === 'string', newState: devolutionState, log: 'Devuelto por Supervisor' }
      ]
    ]
  ])

  const roleRules = rules.get(role)

  for (const rule of roleRules) {
    if (rule.condition) {
      console.log(rule.log)

      return rule.newState
    }
  }

  return role
}

const updateDocs = async (id, approves, userParam) => {
  const hasFieldModifications = typeof approves === 'object' && !Array.isArray(approves)
  const { ref, docSnapshot } = await getDocumentAndUser(id)
  const { start: docStartDate, ot: hasOT } = docSnapshot
  const latestEvent = await getLatestEvent(id)
  const rejected = 10

  const { role, email, displayName } = userParam
  let newState = approves ? getNextState(role, approves, latestEvent) : rejected
  let processedFields = {}

  if (hasFieldModifications) {
    processedFields = processFieldChanges(approves, docSnapshot)
  }

  const addShift =
    (role === 2 && docSnapshot.state >= 6) || (role === 3 && docSnapshot.state === 6) || (role === 6 && newState === 6)

  const addOT = role === 5 && approves && hasOT

  let { incomingFields, changedFields } = processedFields

  // Falta manejar el caso de que procesedFields no pueda desestructurarse

  const prevDoc = { ...incomingFields }

  const OT = addOT ? await increaseAndGetNewOTValue() : null
  const supervisorShift = addShift ? await setSupervisorShift(moment(docStartDate.toDate()).isoWeek()) : null

  changedFields = {
    ...(addOT && OT ? { OT } : {}),
    ...(addShift && supervisorShift ? { supervisorShift } : {}),

    //Solucionar hours=true, no debiese pasar NADA si recibe true

    ...(hasFieldModifications && typeof approves !== 'boolean' ? {} : { [Array.isArray(approves) ? 'draftmen' : 'hours']: approves }),
    ...changedFields
  }

  let newEvent = {
    prevDoc,
    prevState: docSnapshot.state,
    newState,
    user: email,
    userName: displayName,
    date: Timestamp.fromDate(new Date())
  }

  changedFields.state = newState
  console.log(changedFields)

  updateDocumentAndAddEvent(ref, changedFields, userParam, newEvent, docSnapshot.uid, id)
}

// ** Modifica otros campos Usuarios
const updateUserPhone = async (id, obj) => {
  const ref = doc(db, 'users', id)
  const querySnapshot = await getDoc(ref)

  await updateDoc(ref, { phone: obj.replace(/\s/g, '') })
}

// ** Guarda datos contraturno u otros contactos no registrados
const addNewContact = async values => {
  await setDoc(doc(db, 'contacts', 'test'), values)
}

// ** Bloquear o desbloquear un día en la base de datos
const blockDayInDatabase = async (date, cause = '') => {
  const convertDate = moment(date).startOf().toDate()
  const dateUnix = getUnixTime(convertDate) // Convierte la fecha a segundos Unix
  const docRef = doc(collection(db, 'diasBloqueados'), dateUnix.toString())

  const docSnap = await getDoc(docRef)
  if (docSnap.exists()) {
    const data = docSnap.data()
    if (data.blocked === true) {
      // Si el día ya está bloqueado, lo desbloquea en el documento
      await setDoc(docRef, { blocked: false })
      console.log('Día desbloqueado')
    } else if (cause.length > 0) {
      // Si existe pero no está bloqueado, actualiza el campo blocked a true
      await setDoc(docRef, { blocked: true, cause })
      console.log('Día bloqueado')
    } else {
      alert('para bloquear la fecha debe proporcionar un motivo')
    }
  } else if (cause.length > 0) {
    // Si no existe el día, crea el documento con blocked = true
    await setDoc(docRef, { blocked: true, cause })
    console.log('Día bloqueado')
  } else {
    alert('para bloquear la fecha debe proporcionar un motivo')
  }
}

// ** Consultar si existen solicitudes para una fecha específica
const dateWithDocs = async date => {
  if (!date || !date.seconds) {
    return
  }

  const allDocs = []

  //const dateUnix = getUnixTime(date) // Convierte la fecha a segundos Unix
  const q = query(collection(db, 'solicitudes'), where('start', '==', date))
  const querySnapshot = await getDocs(q)

  querySnapshot.forEach(doc => {
    // doc.data() is never undefined for query doc snapshots
    allDocs.push({ ...doc.data(), id: doc.id })
  })

  if (allDocs.length > 0) {
    return `La fecha que está tratando de agendar tiene ${allDocs.length} Solicitudes. Le recomendamos seleccionar otro día`
  } else {
    return 'Fecha Disponible'
  }
}

export {
  newDoc,
  getDocumentAndUser,
  getLatestEvent,
  setSupervisorShift,
  processFieldChanges,
  updateDocumentAndAddEvent,
  getNextState,
  updateDocs,
  updateUserPhone,
  addNewContact,
  blockDayInDatabase,
  dateWithDocs
}
