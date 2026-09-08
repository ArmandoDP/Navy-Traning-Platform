import { NextRequest, NextResponse } from 'next/server'
import { getWellhubConfig }          from '@/lib/wellhub'

export async function POST(req: NextRequest) {
  const { slotId, totalCapacity, totalBooked, sucursalId } = await req.json()

  const { gymId } = getWellhubConfig(sucursalId)

  const body: any = {}
  if (totalCapacity !== undefined) body.total_capacity = totalCapacity
  if (totalBooked   !== undefined) body.total_booked   = totalBooked

  const res = await fetch(
    `https://api.partners.gympass.com/booking/v1/gyms/${gymId}/slots/${slotId}`,
    {
      method:  'PATCH',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.WELLHUB_API_KEY}`,
      },
      body: JSON.stringify(body),
    }
  )
  const text = await res.text()
  let data; try { data = JSON.parse(text) } catch { data = { raw: text } }
  return NextResponse.json({ status: res.status, data })
}