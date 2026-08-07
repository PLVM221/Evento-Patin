import { useEffect, useState } from 'react'
import { CalendarDays, Cloud, CloudLightning, CloudRain, CloudSun, Clock3, MapPin, Snowflake, Sun } from 'lucide-react'

const weatherDetails = (code: number) => code === 0 ? ['Soleado', Sun] as const : code <= 3 ? ['Parcialmente nublado', CloudSun] as const : code <= 48 ? ['Nublado', Cloud] as const : code <= 67 ? ['Lluvia', CloudRain] as const : code <= 77 ? ['Nieve', Snowflake] as const : code <= 82 ? ['Chaparrones', CloudRain] as const : ['Tormenta', CloudLightning] as const

export function WeatherCard({ location, date, time, countdownMinutes }: { location: string; date: string; time: string; countdownMinutes: number }) {
  const [weather, setWeather] = useState<{ temp: number; code: number }>()
  useEffect(() => {
    const load = async () => {
      try {
        const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=es&format=json`).then(response => response.json())
        const place = geo.results?.[0]
        if (!place) return
        const result = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code&timezone=auto`).then(response => response.json())
        setWeather({ temp: result.current.temperature_2m, code: result.current.weather_code })
      } catch { setWeather(undefined) }
    }
    void load()
  }, [location])
  const [label, WeatherIcon] = weatherDetails(weather?.code ?? 1)
  const eventAt = new Date(`${date}T${time}:00`)
  const startsAt = new Date(eventAt.getTime() - countdownMinutes * 60000)
  const timeFormat: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false, hourCycle: 'h23' }
  return <section className="weather-card card"><div className="weather-place"><MapPin /><span><small>LUGAR DEL EVENTO</small><strong>{location}</strong></span></div><div><CalendarDays /><span><small>FECHA</small><strong>{eventAt.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></span></div><div><Clock3 /><span><small>HORARIO PROGRAMADO</small><strong>{eventAt.toLocaleTimeString('es-AR', timeFormat)} hs</strong><em>Aviso desde las {startsAt.toLocaleTimeString('es-AR', timeFormat)} hs</em></span></div><div className="weather-now"><WeatherIcon aria-hidden="true" /><span><small>CLIMA ACTUAL</small><strong>{weather ? `${Math.round(weather.temp)}°C` : '--°C'}</strong><em>{weather ? label : 'Consultando...'}</em></span></div></section>
}
