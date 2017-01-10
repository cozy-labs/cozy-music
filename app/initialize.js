import application from './application'
import Polyglot from 'node-polyglot'
import cozysdk from 'cozysdk-client'

function init (err, instances) {
  if (err) {
    return console.error(err)
  }

  let phrases
  let locale = 'en'

  if (instances[0].value.locale) { locale = instances[0].value.locale }

  try {
    phrases = require('./locales/' + locale)
  } catch (e) {
    phrases = require('./locales/en')
  }
  let polyglot = new Polyglot({phrases: phrases, locale: locale})
  window.t = polyglot.t.bind(polyglot)

  application.start()
}

document.addEventListener('DOMContentLoaded', () => {
  // Cozy instance contains info about the cozy, e.g the language preference
  cozysdk.queryView('cozyinstance', 'all', {}, init)
})
