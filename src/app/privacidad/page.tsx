export default function PrivacidadPage() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#000',
      fontFamily: 'Arial, sans-serif',
      padding: '60px 20px',
    }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        
        <img src="/logo-navy.svg" alt="Navy Training Center" style={{ width: '120px', marginBottom: '40px' }} />
        
        <h1 style={{ color: '#fff', fontSize: '32px', fontWeight: 900, marginBottom: '8px' }}>
          Política de Privacidad
        </h1>
        <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '48px' }}>
          Última actualización: Julio 2026
        </p>

        {[
          {
            titulo: '1. Información que recopilamos',
            texto: 'Navy Training Center recopila información que nos proporcionas directamente, como nombre, correo electrónico, número de teléfono, fecha de nacimiento y datos de pago. También recopilamos información sobre el uso de la app, incluyendo clases reservadas, asistencias y preferencias de entrenamiento.'
          },
          {
            titulo: '2. Cómo usamos tu información',
            texto: 'Usamos tu información para gestionar tu membresía, procesar pagos, enviarte notificaciones sobre tus clases y reservas, mejorar nuestros servicios y comunicarnos contigo sobre cambios en la app o en nuestras sucursales.'
          },
          {
            titulo: '3. Compartir información',
            texto: 'No vendemos tu información personal a terceros. Compartimos datos únicamente con proveedores de servicios necesarios para operar la app, como Stripe para procesamiento de pagos y Supabase para almacenamiento de datos, quienes están obligados a proteger tu información.'
          },
          {
            titulo: '4. Seguridad',
            texto: 'Implementamos medidas de seguridad técnicas y organizativas para proteger tu información personal contra acceso no autorizado, alteración, divulgación o destrucción.'
          },
          {
            titulo: '5. Tus derechos',
            texto: 'Tienes derecho a acceder, corregir o eliminar tu información personal. Puedes hacerlo desde la sección de Perfil en la app o contactándonos directamente.'
          },
          {
            titulo: '6. Datos de menores',
            texto: 'Nuestra app está dirigida a personas mayores de 18 años. No recopilamos intencionalmente información de menores de edad.'
          },
          {
            titulo: '7. Cambios a esta política',
            texto: 'Podemos actualizar esta política de privacidad ocasionalmente. Te notificaremos sobre cambios significativos a través de la app o por correo electrónico.'
          },
          {
            titulo: '8. Contacto',
            texto: 'Si tienes preguntas sobre esta política de privacidad, contáctanos en: hola@navytrainingcenter.com'
          },
        ].map((s, i) => (
          <div key={i} style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
              {s.titulo}
            </h2>
            <p style={{ color: '#9ca3af', fontSize: '15px', lineHeight: '26px', margin: 0 }}>
              {s.texto}
            </p>
          </div>
        ))}

        <div style={{ borderTop: '1px solid #1f2937', paddingTop: '32px', marginTop: '48px' }}>
          <p style={{ color: '#4b5563', fontSize: '13px', textAlign: 'center' }}>
            © 2026 Navy Training Center. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  )
}