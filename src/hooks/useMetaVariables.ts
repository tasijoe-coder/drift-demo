import { useEffect } from 'react'

import { useProjectStore, type Weather } from '../store/useProjectStore'

const weatherPool: Weather[] = ['sunny', 'rain', 'cloudy']

const getMockWeather = () => {
  return weatherPool[Math.floor(Math.random() * weatherPool.length)]
}

export function useMetaVariables() {
  const setMetaVariables = useProjectStore((state) => state.setMetaVariables)

  useEffect(() => {
    const hour = new Date().getHours()
    const isNight = hour >= 23 || hour <= 5
    const weather = getMockWeather()

    setMetaVariables({
      hour,
      weather,
      isNight,
    })
  }, [setMetaVariables])
}
