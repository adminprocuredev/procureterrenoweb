// ** React Imports
import { useState, useEffect } from 'react'

// ** Hooks
import { useFirebase } from 'src/context/useFirebase'

// ** MUI Imports
import Box from '@mui/material/Box'
import { useGridApiRef } from '@mui/x-data-grid';
import { MenuList, MenuItem, Paper, Autocomplete, IconButton, Typography } from '@mui/material'
import { KeyboardDoubleArrowRight, KeyboardDoubleArrowLeft } from '@mui/icons-material'

// ** Custom Components Imports

import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import { jsPDF } from "jspdf";
import "jspdf-autotable";

// ** Demo Components Imports
import tableBody from 'public/html/table.js'
import TableGabinete from 'src/views/table/data-grid/TableGabinete'
import { DialogAssignDesigner } from 'src/@core/components/dialog-assignDesigner'
import { DialogCodeGenerator } from 'src/@core/components/dialog-codeGenerator'
import base64Image from './base64Image.js';

const DataGridGabinete = () => {
  const [currentPetition, setCurrentPetition] = useState('')
  const [currentOT, setCurrentOT] = useState(null)
  const [currentAutoComplete, setCurrentAutoComplete] = useState(null)
  const [roleData, setRoleData] = useState({ name: 'admin' })
  const [errors, setErrors] = useState({})
  const [open, setOpen] = useState(false)
  const [proyectistas, setProyectistas] = useState([])
  const [openCodeGenerator, setOpenCodeGenerator] = useState(false)
  const [blueprintGenerated, setBlueprintGenerated] = useState(false)
  const [designerAssigned, setDesignerAssigned] = useState(false)

  const apiRef = useGridApiRef();
  const { useSnapshot, authUser, getUserData, useBlueprints, fetchPetitionById, generateTransmittalCounter, updateSelectedDocuments } = useFirebase()

  let petitions = useSnapshot(false, authUser, true)

  if (authUser.role === 8) {
    petitions = petitions.filter(petition =>
      petition.designerReview?.find(item => item.hasOwnProperty('userId') && item['userId'] === authUser.uid)
    )
  }

  let tableElement = document.createElement('table');
tableElement.innerHTML = tableBody

  const blueprints = useBlueprints(currentPetition?.id)

  const handleClickOpenCodeGenerator = doc => {
    setOpenCodeGenerator(true)
  }

  const handleCloseCodeGenerator = () => {
    setOpenCodeGenerator(false)
  }

  const handleClickOpen = doc => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  const handleChange = value => {
    console.log(value)
    setCurrentOT(value?.value)
    const currentDoc = petitions.find(doc => doc.ot == value?.value)
    setCurrentPetition(currentDoc)

  }

  const handleClickTransmittalGenerator = async (currentPetition, blueprints) => {
    try {

      // Actualiza el campo lastTransmittal en cada uno de los documentos seleccionados
      const selected = apiRef.current.getSelectedRows();

      // Ahora, añade este contador al final de tu newCode
      const newCode = await generateTransmittalCounter(currentPetition);
      console.log('newCode:', newCode);

      await updateSelectedDocuments(newCode, selected, currentPetition);


      if (selected.size === 0) {
          return alert('Seleccione al menos un documento')
        } else {
        const doc = new jsPDF();

    doc.addImage(base64Image, 'PNG', 15, 10, 50, 20);


        // Define las columnas de la tabla
        const columns = ["Codigo", "Revisión", "Descripción", "Archivo", "Fecha"];
        // Define las filas de la tabla
        let rows = [];

        const data = Array.from(selected).map(([key, value]) => {
          if (value.storageBlueprints) {
            // Divide la URL en segmentos separados por '%2F'
            const urlSegments = value.storageBlueprints[0].split('%2F');

            // Obtiene el último segmento, que debería ser el nombre del archivo
            const encodedFileName = urlSegments[urlSegments.length - 1];

            // Divide el nombre del archivo en segmentos separados por '?'
            const fileNameSegments = encodedFileName.split('?');

            // Obtiene el primer segmento, que debería ser el nombre del archivo
            const fileName = decodeURIComponent(fileNameSegments[0]);

            rows = [
              value.id,
              value.revision,
              value.description,
              fileName,
              value.date.toDate()
            ];
          } else {
            // Devuelve valores predeterminados o vacíos para los objetos que no tienen `storageBlueprints`
            rows = [
              value.id,
              value.revision,
              value.description,
              "", // Empty string for the 'Archivo' column
              value.date.toDate()
            ];
          }

          return rows;
        });

    doc.autoTable({
      startY: 50,
      html: tableElement,
      useCss: true,
    });

    const finalY = doc.lastAutoTable.finalY + 10;

        // Agrega la tabla al documento
    /* doc.autoTable({
      head: [columns],
      body: data,
    }); */


        // Descarga el documento
        doc.save("documento.pdf");
      }

    } catch (error) {
      console.error('Error al generar Transmittal:', error);
      throw new Error('Error al generar Transmittal');
    }
  };

  useEffect(() => {
    const fetchRoleAndProyectistas = async () => {
      if (authUser) {
        // Cargar los proyectistas
        const resProyectistas = await getUserData('getUserProyectistas', null, authUser)
        setProyectistas(resProyectistas)
      }
    }

    fetchRoleAndProyectistas()
  }, [authUser])

  return (
    <Box id='main' sx={{ display: 'flex', width: '100%', height: '600px', flexDirection: 'column' }}>
      <Autocomplete
        options={petitions.map(doc => ({ value: doc.ot, title: doc.title }))}
        getOptionLabel={option => option.value + ' ' + option.title + ' '}
        sx={{ mx: 6.5 }}
        onChange={(event, value) => handleChange(value)}
        onInputChange={(event, value) => setCurrentAutoComplete(value)}
        isOptionEqualToValue={(option, value) => option.value === value.value}
        renderInput={params => <TextField {...params} label='OT' />}
    />
        <Box sx={{ m: 4, display: 'flex' }}>
          <TextField
            sx={{ m: 2.5 , width: '50%' }}
            label='Tipo de levantamiento'
            value={currentPetition ? currentPetition.objective : ''}
            id='form-props-read-only-input'
            InputProps={{ readOnly: true }}
          />
          <TextField
            sx={{ m: 2.5, width: '50%'  }}
            label='Entregable'
            value={currentPetition ? currentPetition.deliverable.map(item => item) : ''}
            id='form-props-read-only-input'
            InputProps={{ readOnly: true }}
          />
          <Autocomplete
            multiple
            readOnly
            sx={{ m: 2.5, width: '100%'  }}
            value={
              (currentOT && petitions.find(doc => doc.ot == currentOT)?.designerReview?.map(item => item.name)) || []
            }
            options={[]}
            renderInput={params => <TextField {...params} label='Proyectistas asignados' readOnly={true} sx={{ '& .MuiInputBase-inputAdornedStart': {display:'none'} }}/>}
          />
           {authUser.role === 7 ? (
            <Button
            sx={{width: '50%', m: 2.5}}
            variant='contained' onClick={() => currentPetition && handleClickOpen(currentPetition)}>
              Asignar proyectista
            </Button>
          ) : authUser.role === 9 ? (
            <Button
              variant='contained'
              onClick={() => currentPetition && handleClickTransmittalGenerator(currentPetition, blueprints)}
            >
              Generar Transmittal
            </Button>
          ) : (
            <Button
              variant='contained'
              onClick={() => currentPetition && handleClickOpenCodeGenerator(currentPetition)}
            >
              Generar nuevo documento
            </Button>
          )}
        </Box>
        <Box sx={{ m: 4, height: '100%' }}>
          <TableGabinete
            rows={blueprints ? blueprints : []}
            roleData={roleData}
            role={authUser.role}
            petitionId={currentPetition ? currentPetition.id : null}
            petition={currentPetition ? currentPetition : null}
            setBlueprintGenerated={setBlueprintGenerated}
            apiRef={apiRef}
          />
        </Box>

      <DialogAssignDesigner
        open={open}
        handleClose={handleClose}
        doc={petitions.find(petition => petition.ot == currentOT)}
        proyectistas={proyectistas}
        setDesignerAssigned={setDesignerAssigned}
      />
      {openCodeGenerator && (
        <DialogCodeGenerator
          open={openCodeGenerator}
          handleClose={handleCloseCodeGenerator}
          doc={currentPetition}
          roleData={roleData}
          setBlueprintGenerated={setBlueprintGenerated}
        />
      )}
    </Box>
  )
}

export default DataGridGabinete
