import React, { useState, useEffect } from 'react'
import {
  DataGridPremium,
  useGridApiRef,
  GRID_AGGREGATION_FUNCTIONS,
  GridAggregationFunction
} from '@mui/x-data-grid-premium'
import { startOfWeek, addDays, format, isToday, isPast, subDays, isSameWeek, isSameDay, isFuture } from 'date-fns'
import { es } from 'date-fns/locale'
import { Box, Button, Typography } from '@mui/material'
import AssignPlantDialog from 'src/@core/components/dialog-assignPlantToHH/index.js'
import NumberInputBasic from 'src/@core/components/custom-number_input/index'
import { Unstable_NumberInput as NumberInput } from '@mui/base/Unstable_NumberInput'

const TableCargaDeHoras = ({
  rows,
  handleCellEditCommit,
  authUser,
  dailyTotals,
  handleSelectionChange,
  selectedRow,
  handleDeleteRow,
  state,
  updateWeekHoursWithPlant,
  reloadTable
}) => {
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedDayDocIds, setSelectedDayDocIds] = useState([])
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 2 })
  const apiRef = useGridApiRef()

  const validationRegex = /^[0-9]*$/

  const NumericInputCell = ({ value, onCommit, rowId, field, dayDocId, rowData, dayTimestamp }) => {
    const maxInput = 12 - (dailyTotals[field] - (value || 0))
    const safeValue = value !== undefined && !isNaN(value) ? value : 0

    const handleChange = val => {
      // Verificar que val sea un número
      const numericValue = parseFloat(val)
      if (!isNaN(numericValue)) {
        const newVal = Math.min(numericValue, maxInput)
        const args = [rowId, field, newVal, rowData, dayTimestamp]
        if (dayDocId) {
          args.push(dayDocId)
        }
        onCommit(...args)
      }
    }

    return (
      <NumberInputBasic
        // type='number'
        value={safeValue}
        onChange={handleChange}
        min={0}
        max={maxInput}
        disabled={!isEditable(dayTimestamp)}
      />
    )
  }

  const isEditable = dayTimestamp => {
    const today = new Date()
    const yesterday = subDays(today, 1)
    const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 2 })
    const endOfCurrentWeek = addDays(startOfCurrentWeek, 6)
    const weekOfDay = startOfWeek(dayTimestamp, { weekStartsOn: 2 })
    //const isCurrentWeek = isSameWeek(today, weekOfDay, { weekStartsOn: 2 })

    const isCurrentWeek = dayTimestamp >= startOfCurrentWeek && dayTimestamp <= endOfCurrentWeek

    if (authUser.role === 5 || authUser.role === 10) {
      // Usuarios con roles 5 o 10 pueden editar días actuales y pasados, pero no futuros
      return dayTimestamp <= today
    } else {
      return isCurrentWeek && (isToday(dayTimestamp) || isSameDay(dayTimestamp, yesterday))
    }
  }

  const sumAggregation = {
    apply: ({ values, column }) => {
      console.log(`Applying aggregation for column: ${column.field}`)
      if (column.field in state.dailyTotals) {
        console.log(`Using dailyTotals for ${column.field}: ${state.dailyTotals[column.field]}`)

        return state.dailyTotals[column.field]
      }
      console.log(`Calculating sum for ${column.field}`)

      return values.reduce((sum, value) => sum + (value || 0), 0)
    },
    columnTypes: ['number'],
    label: 'Sum'
  }

  const handleAssignPlantClick = row => {
    setSelectedDayDocIds(
      ['lunesDocId', 'martesDocId', 'miércolesDocId', 'juevesDocId', 'viernesDocId', 'sábadoDocId', 'domingoDocId']
        .map(dayKey => row[dayKey])
        .filter(docId => docId)
    )
    setAssignDialogOpen(true)
  }

  const handleAssignPlant = async (plant, costCenter) => {
    const userId = state.toggleValue === 'misDatos' ? authUser.uid : state.selectedUser.id

    const result = await updateWeekHoursWithPlant(userId, selectedDayDocIds, plant, costCenter)
    if (result.success) {
      console.log('Plant and cost center assigned successfully')
      reloadTable()
    } else {
      console.error('Error assigning plant and cost center:', result.error)
    }
  }

  const columns = [
    {
      field: 'otNumber',
      headerName: 'OT',
      sortable: false,
      width: 130,
      renderCell: params => (params.row.hoursType === 'OT' ? params.row.otNumber : params.row.hoursType)
    },
    {
      field: 'otType',
      headerName: 'Tipo',
      sortable: false,
      width: 130,
      renderCell: params => (params.row.hoursType === 'OT' ? params.row.otType : params.row.hoursType)
    },
    {
      field: 'plant',
      headerName: 'Planta',
      sortable: false,
      width: 280,
      renderCell: params =>
        params.row.plant ? (
          params.row.plant
        ) : (authUser.role === 5 || authUser.role === 10) && !params.row.isTotalRow ? (
          <Button onClick={() => handleAssignPlantClick(params.row)}>Asignar</Button>
        ) : (
          ''
        )
    },
    {
      field: 'costCenter',
      headerName: 'Centro de Costo',
      sortable: false,
      width: 180,
      renderCell: params => params.row.costCenter
    },
    ...Array.from({ length: 7 }).map((_, index) => {
      const day = addDays(state.currentWeekStart, index)
      const dayKey = format(day, 'eeee', { locale: es }).toLowerCase()
      const dayTimestamp = new Date(day).setHours(0, 0, 0, 0)

      return {
        field: dayKey,
        headerName: `${format(day, 'eee', { locale: es })} ${format(day, 'd')}`,
        width: 130,
        sortable: false,
        renderFooter: () => <Box textAlign='center'>{state.dailyTotals[dayKey]} hrs</Box>,
        editable: isEditable(dayTimestamp),
        aggregable: true,
        aggregationFunction: 'sumAggregation',
        valueFormatter: ({ value }) => value || 0,
        type: 'number',
        renderCell: params =>
          params.row.isTotalRow ? (
            <Box>
              <Typography /* sx={{ color: 'red' }} */>{params.row[dayKey]}</Typography>
            </Box>
          ) : (
            <NumericInputCell
              value={params.row[dayKey] !== undefined ? params.row[dayKey] : 0}
              onCommit={handleCellEditCommit}
              rowId={params.row.rowId}
              field={dayKey}
              dayDocId={params.row[`${dayKey}DocId`]}
              rowData={params.row}
              dayTimestamp={dayTimestamp}
            />
          )
      }
    }),
    {
      field: 'totalRowHours',
      headerName: 'Total Horas',
      width: 130,
      renderFooter: () => (
        <Box textAlign='center'>{rows.reduce((acc, row) => acc + (row.totalRowHours || 0), 0)} hrs</Box>
      ),
      renderCell: params => <span>{params.row.totalRowHours || 0}</span>
    }
  ]

  const initialAggregationModel = columns.reduce((acc, col) => {
    if (col.aggregable) {
      //*acc[col.field] = 'sum'
      // Forzar el valor inicial de dailyTotals en el modelo de agregación
      state.dailyTotals[col.field] = state.dailyTotals[col.field] || 0
    }

    return acc
  }, {})

  const [aggregationModel, setAggregationModel] = useState(initialAggregationModel)

  useEffect(() => {
    setAggregationModel({ ...initialAggregationModel })
  }, [rows])

  const aggregatedRow = {
    rowId: 'totalRow',
    otNumber: 'Total',
    otType: '',
    plant: '',
    isTotalRow: true,
    totalRowHours: rows.reduce((acc, row) => acc + (row.totalRowHours || 0), 0),
    ...state.dailyTotals
  }

  const getRowClassName = params => (params.row.isTotalRow ? 'total-row' : '')
  const isRowSelectable = params => !params.row.isTotalRow

  return (
    <Box style={{ height: 400, width: '100%' }}>
      {/* <Button
        variant='contained'
        color='primary'
        onClick={handleDeleteRow}
        disabled={!selectedRow} // El botón está desactivado si no hay fila seleccionada
      >
        Eliminar Fila
      </Button> */}
      <DataGridPremium
        apiRef={apiRef}
        sx={{
          height: 600,
          '& .total-row': {
            display: 'flex',
            justifyContent: 'flex-end'
          }
        }}
        rows={[...rows, aggregatedRow]}
        columns={columns}
        columnVisibilityModel={{
          costCenter: authUser.role === 5 || authUser.role === 10
        }}
        pageSize={5}
        checkboxSelection
        rowSelectionModel={state.selectedRow ? [state.selectedRow] : []}
        onRowSelectionModelChange={handleSelectionChange}
        disableMultipleRowSelection
        disableRowSelectionOnClick
        onCellEditCommit={handleCellEditCommit}
        getRowId={row => row.rowId}
        aggregationFunctions={{
          ...GRID_AGGREGATION_FUNCTIONS,
          sumAggregation
        }}
        aggregationModel={aggregationModel}
        onAggregationModelChange={newModel => setAggregationModel(newModel)}
        getRowClassName={getRowClassName}
        isRowSelectable={isRowSelectable}
      />
      <AssignPlantDialog
        open={assignDialogOpen}
        onClose={() => setAssignDialogOpen(false)}
        userId={authUser.uid}
        dayDocIds={selectedDayDocIds}
        onAssign={handleAssignPlant}
      />
      <style>
        {`
          .total-row .MuiDataGrid-checkboxInput {
            display: none;
          }
          .total-row {

          }
        `}
      </style>
    </Box>
  )
}

export default TableCargaDeHoras
