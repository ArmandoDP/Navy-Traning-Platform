// Deja un correo en su forma limpia: minúsculas y sin espacios ni caracteres invisibles.
// Al copiar y pegar desde WhatsApp o correo suelen colarse espacios no separables o de ancho cero
// que no se ven, pero hacen que el correo no coincida al iniciar sesión o buscarlo.
export const limpiarCorreo = (s: string | null | undefined): string =>
  String(s ?? '')
    .normalize('NFKC')
    .replace(/[\s​-‏‪-‮⁠﻿]/g, '')
    .toLowerCase()
