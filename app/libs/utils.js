// convert a duration in second to a readable string
export function timeToString (time) {
  var totalSec = Math.floor(time)
  var hours = Math.floor(totalSec / 3600) % 24
  var minutes = Math.floor(totalSec / 60) % 60
  var seconds = totalSec % 60

  hours = (hours < 10 ? '0' + hours : hours)
  minutes = (minutes < 10 ? '0' + minutes : minutes)
  seconds = (seconds < 10 ? '0' + seconds : seconds)

  var r = (hours === '00' ? '' : hours + ':') +
          (minutes === '00' ? '0:' : minutes + ':') +
          seconds
  return r
};

export function getRandomInt (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function getDataURI (url, callback) {
  let image = new Image() // eslint-disable-line

  image.onload = () => {
    let canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight

    canvas.getContext('2d').drawImage(image, 0, 0)
    let uri = canvas.toDataURL('image/png')
    callback(uri)
  }

  image.crossOrigin = 'anonymous'
  image.src = url
}
