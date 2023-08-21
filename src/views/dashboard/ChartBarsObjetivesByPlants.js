// ** React Imports
import { useState, useEffect } from 'react'

// ** MUI Imports
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import { useTheme } from '@mui/material/styles'
import CardHeader from '@mui/material/CardHeader'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'

// ** Icon Imports
import Icon from 'src/@core/components/icon'

// ** Custom Components Imports
import CustomAvatar from 'src/@core/components/mui/avatar'
import OptionsMenu from 'src/@core/components/option-menu'
import ReactApexcharts from 'src/@core/components/react-apexcharts'

// ** Util Import
import { hexToRGBA } from 'src/@core/utils/hex-to-rgba'

// ** Hooks
import { useFirebase } from 'src/context/useFirebase'

const ChartBarsObjetivesByPlants = () => {
  // ** Hook
  const { consultObjetives } = useFirebase()
  const theme = useTheme()

  const [objByPlants, setObjByPlants] = useState([0, 0, 0, 0, 0, 0])

  const plants = [
    'Los Colorados',
    'Laguna Seca 1',
    'Laguna Seca 2',
    'Chancado y Correas',
    'Puerto Coloso',
    'Instalacones Cátodo'
  ]
  const resObjByPlants2 = objByPlants.map((el, index) => ({ x: plants[index], y: el }))
  console.log(resObjByPlants2)

  useEffect(() => {
    const fetchData = async () => {
      const objectivesByPlants = await consultObjetives('byPlants', { plants: ['Planta Concentradora Los Colorados',
      'Planta Concentradora Laguna Seca | Línea 1', 'Planta Concentradora Laguna Seca | Línea 2', 'Chancado y Correas',
      'Puerto Coloso', 'Instalaciones Cátodo'] });

      setObjByPlants(objectivesByPlants)
    }

    fetchData()
  }, [])

  const options = {
    tooltip: {
      x: {
        formatter: function (value, { series, seriesIndex, dataPointIndex, w }) {
          //const value = series[seriesIndex][dataPointIndex];
          const plants = [
            'Los Colorados',
            'Laguna Seca 1',
            'Laguna Seca 2',
            'Chancado y Correas',
            'Puerto Coloso',
            'Instalacones Cátodo'
          ]

          return plants[dataPointIndex]
        }
      }
    },
    chart: {
      parentHeightOffset: 0,
      toolbar: { show: false }
    },
    plotOptions: {
      bar: {
        borderRadius: 8,
        distributed: true,
        columnWidth: '51%',
        endingShape: 'rounded',
        startingShape: 'rounded'
      }
    },
    legend: { show: false },
    dataLabels: { enabled: false },
    colors: [
      hexToRGBA(theme.palette.primary.main, 1),
      hexToRGBA(theme.palette.primary.main, 1),
      hexToRGBA(theme.palette.primary.main, 1),
      hexToRGBA(theme.palette.primary.main, 1),
      hexToRGBA(theme.palette.primary.main, 1),
      hexToRGBA(theme.palette.primary.main, 1),
      hexToRGBA(theme.palette.primary.main, 1)
    ],
    states: {
      hover: {
        filter: { type: 'none' }
      },
      active: {
        filter: { type: 'none' }
      }
    },
    series: [
      {
        data: resObjByPlants2
      }
    ],
    xaxis: {
      axisTicks: { show: false },
      axisBorder: { show: false },
      categories: ['LC', 'LS1', 'LS2', 'ChC', 'PC', 'IC'],
      labels: {
        style: {
          colors: theme.palette.text.disabled
        }
      }
    },
    yaxis: { show: false },
    grid: {
      show: false,
      padding: {
        top: -30,
        left: -7,
        right: -4
      }
    }
  }

  return (
    <Card>
      <CardHeader
        title='Levantamientos por Planta'

        //subheader='Total semanal: 20'
        subheaderTypographyProps={{ sx: { lineHeight: 1.429 } }}
        titleTypographyProps={{ sx: { letterSpacing: '0.15px' } }}
      />
      <CardContent sx={{ pt: { xs: `${theme.spacing(6)} !important`, md: `${theme.spacing(0)} !important` } }}>
        <ReactApexcharts
          type='bar'
          height={120}
          options={options}
          series={[{ name: 'Levantamientos', data: objByPlants }]}
        />
      </CardContent>
    </Card>
  )
}

export default ChartBarsObjetivesByPlants
