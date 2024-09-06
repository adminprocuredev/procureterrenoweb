// ** React Imports
import { useState, forwardRef, useEffect } from 'react'

// ** MUI Imports
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  TextField
} from '@mui/material'
import Fade from '@mui/material/Fade'
import EngineeringIcon from '@mui/icons-material/Engineering'

// ** Icon Imports
import Icon from 'src/@core/components/icon'

// ** Hooks Imports
import { useFirebase } from 'src/context/useFirebase'

const Transition = forwardRef(function Transition(props, ref) {
  return <Fade ref={ref} {...props} />
})

export const DialogCodeGenerator = ({ open, handleClose, doc }) => {
  //falta evaluar la foto del proyectista

  // ** States
  const [error, setError] = useState('')
  const [isSubmitDisabled, setIsSubmitDisabled] = useState(false)
  const [typeOfDiscipline, setTypeOfDiscipline] = useState('')
  const [typeOfDocument, setTypeOfDocument] = useState('')
  const [disciplines, setDisciplines] = useState([])
  const [deliverables, setDeliverables] = useState([])
  const [quantity, setQuantity] = useState(1)
  const [selectedDraftman, setSelectedDraftman] = useState(null)

  // ** Hooks
  const { fetchDisciplineProperties, fetchDeliverablesByDiscipline, generateBlueprintCodes, authUser } = useFirebase()

  useEffect(() => {
    const fetchData = async () => {
      const properties = await fetchDisciplineProperties()
      setDisciplines(Object.keys(properties))
    }

    fetchData()
  }, [])

  const handleChangeTypeOfDiscipline = async event => {
    setTypeOfDiscipline(event.target.value)
    const deliverables = await fetchDeliverablesByDiscipline(event.target.value)
    setDeliverables(Object.keys(deliverables))
  }

  const handleChangeTypeOfDocument = event => {
    setTypeOfDocument(event.target.value)
  }

  const handleQuantityChange = event => {
    setQuantity(event.target.value)
  }

  const handleChangeDraftman = event => {
    const selected = doc.gabineteDraftmen.find(draftman => draftman.name === event.target.value)
    setSelectedDraftman(selected)
  }

  const onsubmit = async id => {
    if (typeOfDiscipline && typeOfDocument && quantity > 0) {
      setIsSubmitDisabled(true)
      try {
        const mappedCodes = await fetchDeliverablesByDiscipline(typeOfDiscipline)
        await generateBlueprintCodes(mappedCodes[typeOfDocument], doc, quantity, selectedDraftman)
        handleClose()
      } catch (error) {
        console.error(error)
        setError('Error generating codes')
      } finally {
        setIsSubmitDisabled(false)
      }
    } else {
      setError('Por favor, indique tipo de disciplina, tipo de documento y cantidad.')
    }
  }

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
            Generar nuevo documento
          </Typography>
          <Typography variant='body2'>Establece parámetros para crear el código</Typography>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', mb: 5 }}>
          <FormControl fullWidth>
            <InputLabel id='draftman-select-label'>Seleccionar Proyectista</InputLabel>
            <Select
              label='Seleccionar Proyectista'
              labelId='draftman-select-label'
              id='draftman-select'
              value={selectedDraftman ? selectedDraftman.name : ''}
              onChange={handleChangeDraftman}
            >
              {doc.gabineteDraftmen.map(draftman => (
                <MenuItem key={draftman.userId} value={draftman.name}>
                  {draftman.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', mb: 5 }}>
          <FormControl fullWidth>
            <InputLabel id='demo-select-small-label'>Tipo de disciplina</InputLabel>
            <Select
              label='Tipo de disciplina'
              labelId='controlled-select-label'
              id='controlled-select'
              value={typeOfDiscipline}
              onChange={handleChangeTypeOfDiscipline}
            >
              {disciplines
                .sort((a, b) => a.localeCompare(b)) // Ordena alfabéticamente las disciplinas
                .map((discipline, index) => (
                  <MenuItem key={index} value={discipline}>
                    {discipline}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', mb: 5 }}>
          <FormControl fullWidth>
            <InputLabel id='demo-select-small-label'>Tipo de documento</InputLabel>
            <Select
              label='Tipo de documento'
              id='controlled-select'
              labelId='controlled-select-label'
              value={typeOfDocument}
              onChange={handleChangeTypeOfDocument}
            >
              {deliverables
                .sort((a, b) => a.localeCompare(b)) // Ordena alfabéticamente los Tipo de documentos
                .map((deliverable, index) => (
                  <MenuItem key={index} value={deliverable}>
                    {deliverable}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', mb: 5 }}>
          <TextField label='Cantidad' type='number' value={quantity} onChange={handleQuantityChange} fullWidth />
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
          <Button
            sx={{ lineHeight: '1.5rem', '& svg': { mr: 2 } }}
            disabled={isSubmitDisabled}
            onClick={() => onsubmit(doc.id)}
          >
            <EngineeringIcon sx={{ fontSize: 18 }} />
            Crear código
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  )
}
