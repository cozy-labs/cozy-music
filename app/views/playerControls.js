import Mn from 'backbone.marionette'
import application from '../application'
import { getRandomInt } from '../libs/utils'

const Player = Mn.ItemView.extend({

  template: require('./templates/playerControls'),

  events: {
    'click #prev': 'prev',
    'click #play': 'toggle',
    'click #next': 'next',
    'click #toggle-expand': 'expand'
  },

  modelEvents: {
    'change:currentTrack': 'render'
  },

  initialize () {
    this.listenTo(application.channel, {
      'player:next': this.next,
      'player:load': this.load,
      'player:render': this.render
    })
    this.listenTo(application.appState, 'change:currentTrack',
            function (appState, currentTrack) {
              if (currentTrack) {
                this.loadAndPlay(currentTrack)
              }
            }
        )

    $(document).keyup((e) => {
      e.preventDefault()
      let audio = application.audio
      let volume
      switch (e.which) {
        case 32: // 'Space'
          this.toggle()
          break
        case 39: // ArrowRight
          this.next()
          break
        case 37: // ArrowLeft
          this.prev()
          break
        case 38: // ArrowUp
          volume = audio.volume + 0.1 > 1 ? 1 : audio.volume + 0.1
          audio.volume = volume
          application.appState.set('currentVolume', volume)
          break
        case 40: // ArrowDown
          volume = audio.volume - 0.1 < 0 ? 0 : audio.volume - 0.1
          audio.volume = volume
          application.appState.set('currentVolume', volume)
          break
        case 77: // m
          // this.toggleVolume();
          let dialog = {
            accept: () => {},
            dismiss: () => {},
            title: t('title track problem'),
            message: t('track problem')
          }
          application.channel.request('dialog', dialog)
          break
      }
    })

    let audio = application.audio
    audio.onended = this.next.bind(this)
    audio.onerror = this.onAudioError.bind(this)
  },

  onAudioError (e) {
    let notification
    switch (e.target.error.code) {
      case e.target.error.MEDIA_ERR_ABORTED:
        notification = {
          status: 'ko',
          message: t('play abort')
        }
        application.channel.request('notification', notification)
        this.reset()
        break
      case e.target.error.MEDIA_ERR_NETWORK:
        notification = {
          status: 'ko',
          message: t('network error')
        }
        application.channel.request('notification', notification)
        this.reset()
        break
      case e.target.error.MEDIA_ERR_DECODE:
        notification = {
          status: 'ko',
          message: t('media error')
        }
        application.channel.request('notification', notification)
        this.reset()
        break
      case e.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
        if (application.audio.src.includes('NO_MUSIC')) break
        let track = this.model.get('currentTrack')
        let dialog = {
          accept: () => {
            application.allTracks.removeTrack(track)
            track.set('hidden', true)
            track.save()
          },
          dismiss: () => { },
          title: t('title track problem'),
          message: t('track problem')
        }
        application.channel.request('dialog', dialog)
        this.reset()
        break
      default:
        notification = {
          status: 'ko',
          message: t('play error')
        }
        application.channel.request('notification', notification)
        this.reset()
    }
  },

  reset () {
    application.appState.set('currentTrack', undefined)
    let audio = application.audio
    audio.pause()
    audio.currentTime = 0
    audio.src = 'NO_MUSIC'
    this.render()
  },

  load (track) {
    let self = this
    track.getStream(function (url) {
      self.play(url, false)
    })
  },

  loadAndPlay (track) {
    let self = this
    track.getStream(function (url) {
      self.play(url, true)
    })
  },

  play (url, play) {
    let audio = application.audio
    audio.src = url
    audio.load()
    if (play) {
      audio.play()
    } else {
      audio.pause()
      audio.currentTime = this.model.get('currentTime')
    }
    this.render()
  },

  toggle () {
    let audio = application.audio
    if (audio.paused && audio.src && !audio.src.includes('NO_MUSIC')) {
      audio.play()
    } else if (audio.src) {
      audio.pause()
    }
    this.render()
  },

  prev () {
    let upNext = application.upNext.get('tracks')
    let currentTrackID = application.appState.get('currentTrack').get('_id')
    let currentTrack = upNext.get(currentTrackID)
    let index = upNext.indexOf(currentTrack)
    let prev = upNext.at(index - 1)
    if (prev) {
      application.appState.set('currentTrack', prev)
    }
  },

  next () {
    let repeat = application.appState.get('repeat')
    let upNext = application.upNext.get('tracks')
    let currentTrackID = application.appState.get('currentTrack').get('_id')
    let currentTrack = upNext.get(currentTrackID)

    let index, next
    let oldIndex = upNext.indexOf(currentTrack)
    if (application.appState.get('shuffle')) {
      do {
        index = getRandomInt(0, upNext.length - 1)
      } while (index === oldIndex)
      next = upNext.at(index)
    } else {
      index = oldIndex + 1
      next = upNext.at(index)
    }

    if (repeat === 'track') {
      this.replayCurrent()
    } else if (next) {
      application.appState.set('currentTrack', next)
    } else if (repeat === 'playlist' && upNext.at(0)) {
      if (upNext.length === 1) {
        this.replayCurrent()
      }
      application.appState.set('currentTrack', upNext.at(0))
    } else {
      this.reset()
    }
  },

  replayCurrent () {
    let audio = application.audio
    audio.currentTime = 0
    audio.play()
    this.render()
  },

  expand (e) {
    e.preventDefault()
    let player = this.$el.parent().parent().get(0)
    let isExpanded = player.getAttribute('aria-expanded') === 'true'
    player.setAttribute('aria-expanded', !isExpanded)
  },

  serializeData () {
    let albumArt = false
    let currentTrack = this.model.get('currentTrack')
    if (currentTrack) {
      let picture = currentTrack.get('metas').picture
      if (picture && picture[0]) {
        albumArt = picture[0].data
      }
    }
    return {
      'isPlaying': !application.audio.paused,
      'albumArt': albumArt
    }
  }

})

export default Player
