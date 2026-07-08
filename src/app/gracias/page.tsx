// app/gracias/page.tsx
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default async function GraciasPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const sessionId = searchParams.session_id;

  if (!sessionId) {
    return <div className="p-10 text-center">Sesión no encontrada.</div>;
  }

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    });
  } catch (err) {
    // session_id inválido, expirado, o manipulado en la URL
    return (
      <div className="p-10 text-center">
        No pudimos verificar tu pago. Si acabas de pagar, revisa tu correo
        para la confirmación, o contáctanos.
      </div>
    );
  }

  // Verificar que el pago realmente se completó (por si alguien pega
  // una URL vieja o cancelada manualmente)
  if (session.payment_status !== 'paid') {
    return (
      <div className="p-10 text-center">
        Tu pago aún no se ha confirmado. Si el problema persiste, contáctanos.
      </div>
    );
  }

  const subscription = session.subscription as Stripe.Subscription | null;
  // customer puede venir "deleted" en teoría — Stripe.Customer | Stripe.DeletedCustomer
  const customer = session.customer as Stripe.Customer;
  const nombreCliente = customer?.deleted ? null : customer?.name;

  const nextBilling = subscription?.current_period_end
    ? new Date(subscription.current_period_end * 1000).toLocaleDateString('es-MX', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null;

  const beneficios = [
    'Precio garantizado de por vida',
    'Acceso ilimitado a todas las clases',
    'Acceso ilimitado al área de GYM',
    'Acceso a todas las sedes CDMX',
    '20% off en nuestros servicios',
  ];

  return (
    <div className="max-w-lg mx-auto py-16 px-6">
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold">
          ¡Bienvenido a Navy{nombreCliente ? `, ${nombreCliente.split(' ')[0]}` : ''}!
        </h1>
        <p className="text-gray-600 mt-2">Tu lugar como Founding Member está asegurado.</p>
      </div>

      <div className="bg-gray-50 rounded-xl p-6 space-y-3 mb-8">
        <div className="flex justify-between">
          <span className="text-gray-500">Plan</span>
          <span className="font-medium">Founding Member — {session.metadata?.sucursal}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Precio bloqueado</span>
          <span className="font-medium">
            ${((session.amount_total || 0) / 100).toLocaleString()} MXN / 3 meses
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Correo</span>
          <span className="font-medium">{session.customer_details?.email}</span>
        </div>
        {nextBilling && (
          <div className="flex justify-between">
            <span className="text-gray-500">Próximo cobro</span>
            <span className="font-medium">{nextBilling}</span>
          </div>
        )}
      </div>

      <div>
        <h2 className="font-semibold mb-3">Tus beneficios</h2>
        <ul className="space-y-2">
          {beneficios.map((b) => (
            <li key={b} className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-green-600">✓</span> {b}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-gray-400 text-center mt-8">
        Revisa tu correo, te enviamos la confirmación y los siguientes pasos.
      </p>
    </div>
  );
}