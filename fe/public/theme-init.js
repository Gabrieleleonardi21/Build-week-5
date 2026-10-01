// Tema applicato PRIMA che React parta: senza, chi usa il tema scuro vedrebbe un lampo bianco.
// Stessa chiave e stessa logica di next-themes ("theme" in localStorage, altrimenti tema di sistema).
;(function () {
  var theme = null
  try {
    theme = window.localStorage.getItem('theme')
  } catch (error) {
    // Storage bloccato (navigazione privata): si segue il sistema.
  }
  if (theme !== 'light' && theme !== 'dark') {
    theme = 'light'
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      theme = 'dark'
    }
  }
  document.documentElement.classList.add(theme)
  document.documentElement.style.colorScheme = theme
})()
