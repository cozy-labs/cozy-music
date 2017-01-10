import Mn from 'backbone.marionette'
import application from '../application'
import { timeToString } from '../libs/utils'

const Timeline = Mn.ItemView.extend({

  template: require('./templates/playerTimeline'),

  ui: {
    progressBar: '#progress-bar'
  },

  modelEvents: {
    'change:currentTrack': 'render'
  },

  events: {
    'mousedown @ui.progressBar': 'skip'
  },

  initialize () {
    $(document).mousemove((e) => {
      if (this.progressDown) {
        this.skip(e)
      }
    })
    $(document).mouseup((e) => {
      this.progressDown = false
    })
    let audio = application.audio
    audio.ontimeupdate = this.render
    this.listenTo(application.channel, 'player:load', this.render)
  },

  // Go to a certain time in the track
  skip (e) {
    this.progressDown = true
    let audio = application.audio
    let bar = this.ui.progressBar.get(0)
    let percent = (e.pageX - bar.offsetLeft) / bar.clientWidth
    if (isFinite(audio.duration) && percent > 0 && percent < 1) {
      audio.currentTime = audio.duration * percent
    }
  },

  serializeData () {
    let currentTrack = application.appState.get('currentTrack')
    let audio = application.audio
    let currentTime, totalTime, timePercent, title, artist

    if (currentTrack) {
      currentTime = timeToString(audio.currentTime)
      totalTime = isNaN(audio.duration) ? '00:00' : timeToString(audio.duration)
      timePercent = audio.currentTime / audio.duration * 100 + '%'
      title = currentTrack.get('metas').title
      artist = currentTrack.get('metas').artist
    } else {
      currentTime = '00:00'
      totalTime = '00:00'
      timePercent = '00:00'
      title = t('no playing music')
      artist = ''
    }
    return {
      'audioCurrentTime': currentTime,
      'totalTime': totalTime,
      'timePercent': timePercent,
      'title': title,
      'artist': artist
    }
  }
})

export default Timeline
