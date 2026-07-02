import { NextRequest, NextResponse } from 'next/server'
import { stripe }                    from '@/lib/stripe'
import { supabase }                  from '@/lib/supabase'

export const config = { api: { bodyParser: false } }

// Helper para buscar cliente por stripe_customer_id
async function findCliente(stripeCustomerId: string) {
  if (!stripeCustomerId) return null
  const { data } = await supabase
    .from('clientes')
    .select('id, nombre_completo')
    .eq('stripe_customer_id', stripeCustomerId)
    .single()
  return data
}

export async function POST(req: NextRequest) {
  const body      = await req.text()
  const signature = req.headers.get('stripe-signature')!

  let event: any

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('Webhook signature error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 400 })
  }

  try {
    switch (event.type) {

      // ── Pago exitoso ──────────────────────────────────────────────────────
      case 'payment_intent.succeeded': {
        const pi      = event.data.object
        const cliente = await findCliente(pi.customer)
        await supabase.from('pagos').insert({
          stripe_payment_intent_id: pi.id,
          cliente_id:               cliente?.id || null,
          cliente_stripe_id:        pi.customer || null,
          monto:                    pi.amount / 100,
          moneda:                   pi.currency.toUpperCase(),
          estatus:                  'Exitoso',
          metodo_pago:              pi.payment_method_types?.[0] || 'card',
          concepto:                 pi.description || 'Pago con tarjeta',
          fecha_pago:               new Date(pi.created * 1000).toISOString(),
          metadata:                 pi.metadata || {},
        })
        break
      }

      // ── Pago fallido ──────────────────────────────────────────────────────
      case 'payment_intent.payment_failed': {
        const pi      = event.data.object
        const cliente = await findCliente(pi.customer)
        await supabase.from('pagos').insert({
          stripe_payment_intent_id: pi.id,
          cliente_id:               cliente?.id || null,
          cliente_stripe_id:        pi.customer || null,
          monto:                    pi.amount / 100,
          moneda:                   pi.currency.toUpperCase(),
          estatus:                  'Fallido',
          metodo_pago:              pi.payment_method_types?.[0] || 'card',
          concepto:                 'Pago fallido',
          fecha_pago:               new Date(pi.created * 1000).toISOString(),
          metadata:                 pi.metadata || {},
        })
        await supabase.from('alertas').insert({
          tipo:        'pago_fallido',
          categoria:   'operacion',
          titulo:      `Pago fallido${cliente ? ` — ${cliente.nombre_completo}` : ''} — $${(pi.amount / 100).toLocaleString()}`,
          descripcion: pi.last_payment_error?.message || 'El pago fue rechazado',
          cliente_id:  cliente?.id || null,
          metadata:    { stripe_payment_intent_id: pi.id },
        })
        break
      }

      // ── Suscripción creada ────────────────────────────────────────────────
      case 'customer.subscription.created': {
        const sub     = event.data.object
        const cliente = await findCliente(sub.customer)
        await supabase.from('pagos').insert({
          stripe_subscription_id: sub.id,
          stripe_customer_id:     sub.customer,
          cliente_id:             cliente?.id || null,
          monto:                  sub.items.data[0]?.price?.unit_amount / 100 || 0,
          moneda:                 sub.currency?.toUpperCase() || 'MXN',
          estatus:                'Exitoso',
          concepto:               'Nueva suscripción',
          metodo_pago:            'Tarjeta',
          fecha_pago:             new Date(sub.created * 1000).toISOString(),
          metadata:               { stripe_subscription_id: sub.id },
        })
        // Actualizar estatus del cliente a Activo
        if (cliente) {
          await supabase.from('clientes')
            .update({ estatus: 'Activo' })
            .eq('id', cliente.id)
        }
        break
      }

      // ── Suscripción actualizada ───────────────────────────────────────────
      case 'customer.subscription.updated': {
        const sub     = event.data.object
        const cliente = await findCliente(sub.customer)
        if (cliente) {
          const nuevoEstatus = sub.status === 'active'   ? 'Activo'
            : sub.status === 'past_due'                  ? 'Vencido'
            : sub.status === 'canceled'                  ? 'Inactivo'
            : sub.status === 'paused'                    ? 'Inactivo'
            : null
          if (nuevoEstatus) {
            await supabase.from('clientes')
              .update({ estatus: nuevoEstatus })
              .eq('id', cliente.id)
          }
        }
        break
      }

      // ── Suscripción cancelada ─────────────────────────────────────────────
      case 'customer.subscription.deleted': {
        const sub     = event.data.object
        const cliente = await findCliente(sub.customer)
        if (cliente) {
          await supabase.from('clientes')
            .update({ estatus: 'Inactivo' })
            .eq('id', cliente.id)
          await supabase.from('alertas').insert({
            tipo:        'membresia_vence',
            categoria:   'vencimiento',
            titulo:      `Suscripción cancelada — ${cliente.nombre_completo}`,
            descripcion: 'La suscripción fue cancelada en Stripe',
            cliente_id:  cliente.id,
            metadata:    { stripe_subscription_id: sub.id },
          })
        }
        break
      }

      // ── Factura pagada (renovación) ───────────────────────────────────────
      case 'invoice.payment_succeeded': {
        const inv     = event.data.object
        const cliente = await findCliente(inv.customer)
        if (inv.billing_reason === 'subscription_cycle') {
          await supabase.from('pagos').insert({
            stripe_invoice_id:  inv.id,
            stripe_customer_id: inv.customer,
            cliente_id:         cliente?.id || null,
            monto:              inv.amount_paid / 100,
            moneda:             inv.currency.toUpperCase(),
            estatus:            'Exitoso',
            concepto:           'Renovación automática',
            metodo_pago:        'Tarjeta',
            fecha_pago:         new Date(inv.created * 1000).toISOString(),
            metadata:           { stripe_invoice_id: inv.id },
          })
        }
        break
      }

      // ── Factura creada ────────────────────────────────────────────────────
      case 'invoice.created': {
        const inv = event.data.object
        console.log(`Factura creada: ${inv.id} — $${inv.amount_due / 100}`)
        break
      }

      // ── Factura fallida ───────────────────────────────────────────────────
      case 'invoice.payment_failed': {
        const inv     = event.data.object
        const cliente = await findCliente(inv.customer)
        await supabase.from('alertas').insert({
          tipo:        'pago_fallido',
          categoria:   'operacion',
          titulo:      `Pago fallido${cliente ? ` — ${cliente.nombre_completo}` : ''}`,
          descripcion: `$${(inv.amount_due / 100).toLocaleString()} · Fondos insuficientes`,
          cliente_id:  cliente?.id || null,
          metadata:    { stripe_invoice_id: inv.id, stripe_customer_id: inv.customer },
        })
        break
      }

      // ── Reembolso ─────────────────────────────────────────────────────────
      case 'charge.refunded': {
        const charge  = event.data.object
        const cliente = await findCliente(charge.customer)
        await supabase.from('pagos').insert({
          stripe_payment_intent_id: charge.payment_intent || null,
          stripe_customer_id:       charge.customer || null,
          cliente_id:               cliente?.id || null,
          monto:                    -(charge.amount_refunded / 100),
          moneda:                   charge.currency.toUpperCase(),
          estatus:                  'Reembolsado',
          metodo_pago:              'Tarjeta',
          concepto:                 'Reembolso',
          fecha_pago:               new Date(charge.created * 1000).toISOString(),
          metadata:                 { charge_id: charge.id },
        })
        await supabase.from('alertas').insert({
          tipo:        'pago_fallido',
          categoria:   'operacion',
          titulo:      `Reembolso procesado${cliente ? ` — ${cliente.nombre_completo}` : ''}`,
          descripcion: `$${(charge.amount_refunded / 100).toLocaleString()} reembolsados`,
          cliente_id:  cliente?.id || null,
          metadata:    { charge_id: charge.id },
        })
        break
      }

      // ── Contracargo (chargeback) ──────────────────────────────────────────
      case 'charge.dispute.created': {
        const dispute = event.data.object
        const cliente = await findCliente(dispute.charge)
        await supabase.from('alertas').insert({
          tipo:        'pago_fallido',
          categoria:   'operacion',
          titulo:      `⚠ Contracargo — $${(dispute.amount / 100).toLocaleString()}`,
          descripcion: `Razón: ${dispute.reason} · Estado: ${dispute.status}`,
          cliente_id:  cliente?.id || null,
          metadata:    { dispute_id: dispute.id, charge_id: dispute.charge },
        })
        break
      }

      // ── Cliente creado en Stripe ──────────────────────────────────────────
      case 'customer.created': {
        const customer = event.data.object
        // Si tiene email, intentar vincular con cliente existente
        if (customer.email) {
          const { data: cliente } = await supabase
            .from('clientes')
            .select('id')
            .eq('email', customer.email)
            .single()
          if (cliente) {
            await supabase.from('clientes')
              .update({ stripe_customer_id: customer.id })
              .eq('id', cliente.id)
          }
        }
        break
      }

      // ── Cliente eliminado en Stripe ───────────────────────────────────────
      case 'customer.deleted': {
        const customer = event.data.object
        const cliente  = await findCliente(customer.id)
        if (cliente) {
          await supabase.from('clientes')
            .update({ stripe_customer_id: null, estatus: 'Inactivo' })
            .eq('id', cliente.id)
        }
        break
      }

      // ── Método de pago agregado ───────────────────────────────────────────
      case 'payment_method.attached': {
        const pm = event.data.object
        console.log(`Método de pago agregado: ${pm.id} — ${pm.type} para customer ${pm.customer}`)
        break
      }

      default:
        console.log(`Evento no manejado: ${event.type}`)
    }

  } catch (err: any) {
    console.error('Error procesando webhook:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}