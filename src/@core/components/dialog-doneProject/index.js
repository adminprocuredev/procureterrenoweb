// ** React Imports
import { forwardRef, useState } from 'react'

// ** MUI Imports
import EngineeringIcon from '@mui/icons-material/Engineering'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import Fade from '@mui/material/Fade'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { LocalizationProvider, MobileDatePicker } from '@mui/x-date-pickers'
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment'

// ** Date Library
//import moment from 'moment'
import moment from 'moment-timezone'
import 'moment/locale/es'

// ** Icon Imports
import Icon from 'src/@core/components/icon'

// ** Hooks Imports
import { CircularProgress, FormControl } from '@mui/material'
import { useFirebase } from 'src/context/useFirebase'

const Transition = forwardRef(function Transition(props, ref) {
  return <Fade ref={ref} {...props} />
})

const StyledFormControl = props => (
  <FormControl fullWidth sx={{ '& .MuiFormControl-root': { width: '100%' } }} {...props} />
)

export const DialogDoneProject = ({ open, doc, handleClose }) => {
  // ** States

  const [draftmen, setDraftmen] = useState([])
  const [loading, setLoading] = useState(false)

  const [uprisingTimeSelected, setUprisingTimeSelected] = useState({
    // start: null,
    // end: null,
    hours: 0,
    minutes: 0
  })
  const [error, setError] = useState('')
  const [isSubmitDisabled, setIsSubmitDisabled] = useState(false)
  const [deadlineDate, setDeadlineDate] = useState(moment())

  // ** Hooks
  const { updateDocs, authUser } = useFirebase()

  const workDayStart = new Date(0, 0, 0, 8, 0) // Hora de inicio de la jornada laboral (08:00 AM)
  const workDayEnd = new Date(0, 0, 0, 20, 0) // Hora de finalización de la jornada laboral (08:00 PM)

  const handleClickDelete = name => {
    // Filtramos el array draftmen para mantener todos los elementos excepto aquel con el nombre proporcionado
    const updatedDraftmen = draftmen.filter(draftman => draftman.name !== name)

    // Actualizamos el estado con el nuevo array actualizado
    setDraftmen(updatedDraftmen)
  }

  const handleKeyDown = (event) => {
    if (event.key === '.' || event.key === ',' || event.key === '-' || event.key === '+') {
      event.preventDefault()
    }
  }

  const handlePaste = (event) => {
    event.preventDefault()
    setError('No se permite pegar valores en este campo.')
  }

  const handleInputChange = e => {
    let inputValue = e.target.value

    // Verifica si el valor ingresado es un número y si es mayor a 1
    if (!isNaN(inputValue) && Number(inputValue) > 0 && !inputValue.startsWith('0')) {
      setUprisingTimeSelected({hours: Number(inputValue), minutes: 0})
      setError('') // Limpia el mensaje de error si existe
    } else {
      setUprisingTimeSelected('')
      setError('Por favor, ingrese un número mayor a 1.')
    }
  }

  const handleDateChange = dateField => async date => {
    const fieldValue = moment(date.toDate())
    setDeadlineDate(fieldValue)
  }

  const onSubmit = id => {
    if (uprisingTimeSelected.hours > 0) {
      setLoading(true)
      updateDocs(id, { uprisingInvestedHours: uprisingTimeSelected, deadline: deadlineDate }, authUser)
        .then(() => {
          setLoading(false)
          handleClose()
        })
        .catch(error => {
          alert.error(error)
          console.error(error)
          setLoading(false)
          handleClose()
        })
    } else {
      setError('Por favor, indique fecha de inicio y fecha de término.')
    }
  }

  const handleDateChangeWrapper = dateField => date => {
    if (!date) {
      console.error('La fecha proporcionada es nula')

      return
    }

    const handleDateChange = date => {
      const fieldValue = moment(date.toDate())
      const updatedHours = { ...uprisingTimeSelected }

      if (dateField === 'start') {
        updatedHours.start = fieldValue
      } else {
        updatedHours.end = fieldValue
      }

      setUprisingTimeSelected(updatedHours)
    }

    handleDateChange(date)
  }

  // useEffect(() => {
  //   if (uprisingTimeSelected.start && uprisingTimeSelected.end) {
  //     const workStartHour = 8 // Hora de inicio de la jornada laboral
  //     const workEndHour = 20 // Hora de finalización de la jornada laboral
  //     const millisecondsPerHour = 60 * 60 * 1000 // Milisegundos por hora

  //     let startDate = uprisingTimeSelected.start.clone()
  //     let endDate = uprisingTimeSelected.end.clone()

  //     // Asegurarse de que las fechas estén dentro de las horas de trabajo
  //     if (startDate.hour() < workStartHour) {
  //       startDate.hour(workStartHour).minute(0).second(0).millisecond(0)
  //     }
  //     if (endDate.hour() > workEndHour) {
  //       endDate.hour(workEndHour).minute(0).second(0).millisecond(0)
  //     } else if (endDate.hour() < workStartHour) {
  //       endDate.subtract(1, 'day').hour(workEndHour).minute(0).second(0).millisecond(0)
  //     }

  //     let totalHoursWithinWorkingDays = 0
  //     let totalMinutes = 0

  //     while (startDate.isBefore(endDate)) {
  //       const currentDayEnd = startDate.clone().hour(workEndHour)

  //       if (currentDayEnd.isAfter(endDate)) {
  //         const durationMillis = endDate.diff(startDate)
  //         totalHoursWithinWorkingDays += Math.floor(durationMillis / millisecondsPerHour)
  //         totalMinutes += Math.floor((durationMillis % millisecondsPerHour) / (60 * 1000))
  //       } else {
  //         const durationMillis = currentDayEnd.diff(startDate)
  //         totalHoursWithinWorkingDays += Math.floor(durationMillis / millisecondsPerHour)
  //       }

  //       startDate.add(1, 'day').hour(workStartHour)
  //     }

  //     if (totalMinutes >= 60) {
  //       totalHoursWithinWorkingDays += Math.floor(totalMinutes / 60)
  //       totalMinutes %= 60
  //     }

  //     //console.log(totalHoursWithinWorkingDays, totalMinutes, 'RES')

  //     if (totalHoursWithinWorkingDays === 0 && totalMinutes === 0) {
  //       setError('La hora de término debe ser superior a la hora de inicio.')
  //       setIsSubmitDisabled(true)

  //       return
  //     } else {
  //       setError(null) // Para limpiar cualquier error previo.
  //       setIsSubmitDisabled(false)
  //     }

  //     const startDateAsDate = uprisingTimeSelected.start.toDate()
  //     const endDateAsDate = uprisingTimeSelected.end.toDate()

  //     setUprisingTimeSelected(prevHours => ({
  //       ...prevHours,
  //       uprisingInvestedHours: {
  //         hours: totalHoursWithinWorkingDays,
  //         minutes: totalMinutes,
  //         selectedStartDate: startDateAsDate,
  //         selectedEndDate: endDateAsDate
  //       }
  //     }))
  //   }
  // }, [uprisingTimeSelected.start, uprisingTimeSelected.end])

  const getInitials = string => string.split(/\s/).reduce((response, word) => (response += word.slice(0, 1)), '')

  return (
    <Dialog
      fullWidth
      open={open}
      maxWidth='xs'
      scroll='body'
      onClose={() => handleClose()}
      TransitionComponent={Transition}
      onBackdropClick={() => handleClose()}
    >
      <DialogContent sx={{ px: { xs: 8, sm: 15 }, py: { xs: 8, sm: 12.5 }, position: 'relative' }}>
        <IconButton
          size='small'
          onClick={() => handleClose()}
          sx={{ position: 'absolute', right: '1rem', top: '1rem' }}
        >
          <Icon icon='mdi:close' />
        </IconButton>
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant='h5' sx={{ mb: 3, lineHeight: '2rem' }}>
            Terminar Levantamiento
          </Typography>
          <Typography variant='body2'>Establece el total de horas</Typography>
        </Box>
        {loading ? (
          <CircularProgress />
        ) : (
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            {/* Horas invertidas en Levantamiento */}
            <TextField
              type='number'
              value={uprisingTimeSelected.hours}
              label='Horas de trabajo del Levantamiento'
              error={error !== ''}
              helperText={error}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              fullWidth
              sx={{ mb: 6 }} // Ajusta el espacio entre los dos campos
            />

            {/* Fecha Límite */}
            <FormControl fullWidth>
              <LocalizationProvider
                dateAdapter={AdapterMoment}
                adapterLocale='es'
                localeText={{
                  okButtonLabel: 'Aceptar',
                  cancelButtonLabel: 'Cancelar',
                  datePickerToolbarTitle: 'Selecciona Fecha'
                }}
              >
                <MobileDatePicker
                  dayOfWeekFormatter={(day) => day.substring(0, 2).toUpperCase()}
                  minDate={moment().subtract(1, 'year')}
                  maxDate={moment().add(1, 'year')}
                  label='Fecha Límite (Entrega de Gabinete)'
                  value={deadlineDate && moment.isMoment(deadlineDate) ? deadlineDate : moment(deadlineDate)}
                  onChange={handleDateChange(deadlineDate)}
                  InputLabelProps={{ shrink: true, required: true }}
                  viewRenderers={{ minutes: null }}
                  slotProps={{ toolbar: { hidden: false } }}
                />
              </LocalizationProvider>
            </FormControl>
          </Box>
        )}

        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
          <Button
            sx={{ lineHeight: '1.5rem', '& svg': { mr: 2 } }}
            disabled={isSubmitDisabled || error || uprisingTimeSelected.hours <= 0}
            onClick={() => onSubmit(doc.id)}
          >
            <EngineeringIcon sx={{ fontSize: 18 }} />
            Guardar
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  )
}

//export default DialogAssignProject
