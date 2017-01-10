import Mn from 'backbone.marionette'
import application from '../application'
import { timeToString } from '../libs/utils'
import PopPlaylistView from './popupPlaylists'

const TrackView = Mn.LayoutView.extend({

  template: require('./templates/track'),

  tagName: 'li',

  ui: {
    'play': '.play',
    'menu': '.menu',
    'popupMenu': '#popup-menu'
  },

  regions: {
    playlistPopup: '.playlist-popup-container'
  },

  events: {
    'dblclick': 'play',
    'mousedown': 'select',
    'click @ui.play': 'play',
    'click @ui.menu': 'toggleMenu',
    'click .add-to-upnext': 'addToUpNext',
    'mouseenter .add-to-playlist': 'showPlaylistPopup',
    'mouseleave .add-to-playlist': 'hidePlaylistPopup',
    'click .album-to-upnext': 'albumToUpNext',
    'click .edit-details': 'editDetails',
    'click .delete': 'delete',
    'click .delete-from-upnext': 'removeFromUpNext',
    'click .remove-from-playlist': 'removeFromPlaylist',
    'mouseleave #popup-menu': 'hidePopupMenu'
  },

  modelEvents: {
    change: 'render'
  },

  attributes () {
    return {
      'data-id': this.model.get('_id')
    }
  },

  initialize () {
    this.listenTo(application.appState, {
      'change:currentTrack': this.togglePlayingState,
      'change:currentPlaylist': this.setOrder,
      'change:sort': this.setOrder
    })

    // if the current track is added or removed from a playlist, run setPlaylist()
    this.listenTo(application.channel, 'track:playlistChanged', (track) => {
      if (track && track.get('_id') === this.model.get('_id')) {
        this.setClass()
      }
    }, this)

    // Reorder the track on drag and drop
    this.listenTo(application.channel, 'playlist:reorder', (tracks) => {
      if (tracks.get(this.model.get('_id'))) {
        this.setClass()
        this.setOrder()
      }
    }, this)

    this.listenTo(application.channel, 'track:hideMenu', () => {
      let selectedTracks = application.selected.get('tracks')
      let isSelected = selectedTracks.get(this.model.get('_id'))
      if (!isSelected) {
        this.hidePopupMenu()
      }
    })
  },

  onRender () {
    this.showChildView('playlistPopup', new PopPlaylistView({
      model: this.model,
      collection: application.allPlaylists
    }))
    application.loadPlaylist.then(this.setClass.bind(this))
  },

  select (e) {
    e.preventDefault()

    let selectedTracks = application.selected.get('tracks')
    let isSelected = selectedTracks.get(this.model.get('_id'))
    let isMenuTouch = $(e.target).parents('#popup-menu').length

    // If we are on a touch capable device, play the track on touch
    if ('ontouchstart' in window && isSelected && !isMenuTouch) {
      this.play(e)
      return
    }

    // Prevent resetting the selected playlist when clicking on menu
    if (e.target.parentElement.parentElement.id !== 'track-list') {
      // if this.model is not selected, select only it, else prevent reset
      if (!isSelected) {
        application.selected.resetTrack(this.model)
      } else {
        return
      }
    }

    if (selectedTracks.length === 0) {
      application.selected.addTrack(this.model)
    } else if (selectedTracks.length !== 0 && e.ctrlKey) {
      application.selected.addTrack(this.model)
    } else if (selectedTracks.length !== 0 && e.shiftKey) {
      let currentPlaylist = application.appState.get('currentPlaylist')
      let collection = currentPlaylist.get('tracks')

      let sort = application.appState.get('sort')
      if (sort.by !== 'default') {
        collection = sort.by
      }
      let lastAddedTrack = selectedTracks.at(-1)
      lastAddedTrack = collection.get(lastAddedTrack.get('_id'))
      let thisTrack = collection.get(this.model.get('_id'))

      let startIndex = collection.indexOf(lastAddedTrack)
      let endIndex = collection.indexOf(thisTrack)

      // Switch the two index
      if (endIndex < startIndex) {
        let temp = startIndex
        startIndex = endIndex
        endIndex = temp
      }
      for (let i = startIndex; i <= endIndex; i++) {
        let id = collection.at(i).get('_id')
        let track = application.allTracks.get('tracks').get(id)
        application.selected.addTrack(track)
      }
    } else if (selectedTracks.length !== 0) {
      application.selected.resetTrack(this.model)
    }
  },

  play (e) {
    e.preventDefault()
    application.channel.trigger('upnext:addCurrentPlaylist')
    application.appState.set('currentTrack', this.model)
  },

  toggleMenu (e) {
    e.stopPropagation()
    this.ui.popupMenu.toggleClass('show')
    this.ui.menu.toggleClass('active')
  },

  hidePopupMenu (e) {
    this.ui.popupMenu.removeClass('show')
    this.ui.menu.removeClass('active')
  },

  showPlaylistPopup (e) {
    application.channel.trigger('playlistPopup:show', this.model)
  },

  hidePlaylistPopup (e) {
    application.channel.trigger('playlistPopup:hide', this.model)
  },

  // Add this model to upNext
  addToUpNext (e) {
    e.stopPropagation()
    let tracks = application.selected.get('tracks')
    tracks.each((t) => {
      application.upNext.addTrack(t)
    })
    this.hidePopupMenu()

    let notification = {
      status: 'ok',
      message: t('added to upnext')
    }
    application.channel.request('notification', notification)
  },

  // Remove this model from up next
  removeFromUpNext (e) {
    e.stopPropagation()
    let tracks = application.selected.get('tracks')
    tracks.each((t) => {
      if (t === application.appState.get('currentTrack')) {
        application.channel.trigger('player:next')
      }
      application.upNext.removeTrack(t)
    })
  },

  // Remove the model from the current playlist
  removeFromPlaylist (e) {
    e.stopPropagation()
    let tracks = application.selected.get('tracks')
    tracks.each((t) => {
      application.appState.get('currentPlaylist').removeTrack(t)
    })
  },

  // TO DO
  albumToUpNext (e) {
    e.stopPropagation()
  },

  // TO DO
  editDetails (e) {
    e.stopPropagation()
  },

  delete (e) {
    e.stopPropagation()
    let track = this.model
    track.set('hidden', true)
    track.save()
    application.allTracks.removeTrack(track)
  },

  setClass () {
    this.className = ''
    this.order = []

    // Check if track is in upNext
    let tracks = application.upNext.get('tracks')
    let track = tracks.findWhere({ _id: this.model.get('_id') })
    if (track) {
      this.className += ' playlist-upNext'
      this.order.push({ id: 'upNext', order: tracks.indexOf(track) })
    }

    // Check if track is in search
    tracks = application.search.get('tracks')
    track = tracks.findWhere({ _id: this.model.get('_id') })
    if (track) {
      this.className += ' playlist-search'
    }

    // Check if track is in selected
    tracks = application.selected.get('tracks')
    track = tracks.findWhere({ _id: this.model.get('_id') })
    if (track) {
      this.className += ' selected'
    }

    // Check if track is in a playlist
    let playlists = application.allPlaylists
    playlists.each((playlist) => {
      let tracks = playlist.get('tracks')
      let track = tracks.findWhere({ _id: this.model.get('_id') })
      if (track) {
        this.className += ' playlist-' + playlist.get('_id')
        this.order.push({ id: playlist.get('_id'), order: tracks.indexOf(track) })
      }
    })
    this.$el.get(0).className = this.className
    this.setOrder()
    this.togglePlayingState()
  },

  serializeData () {
    let metas = this.model.get('metas')
    let currentPlaylist = application.appState.get('currentPlaylist')
    return _.extend(_.defaults({}, metas, {
      artist: '',
      album: '',
      number: '',
      type: currentPlaylist.get('type')
    }), {
      duration: metas.duration ? timeToString(metas.duration / 1000) : '--:--'
    })
  },

  setOrder () {
    let sort = application.appState.get('sort')
    let orderTrack = ''
    let currentPlaylist = application.appState.get('currentPlaylist')
    let type = currentPlaylist.get('type')
    if (type === 'upNext') {
      if (this.$el.hasClass('playlist-upNext')) {
        let orderObj = this.order.find((o) => {
          return o.id === 'upNext'
        })
        orderTrack = orderObj.order
      }
    } else if (sort.by !== 'default') {
      let collection = sort.by
      let track = collection.get(this.model.get('_id'))
      orderTrack = collection.indexOf(track)
      if (sort.direction === 'reverse') {
        orderTrack = collection.length - orderTrack + 1
      }
    } else if (type === 'playlist') {
      let id = currentPlaylist.get('_id')
      if (this.$el.hasClass('playlist-' + id)) {
        let orderObj = this.order.find((o) => {
          return o.id === id
        })
        orderTrack = orderObj.order
      }
    }
    this.$el.get(0).style.order = orderTrack
  },

  // Add the playling class if the current track is this model
  togglePlayingState () {
    let isPlayed
    let currentTrack = application.appState.get('currentTrack')
    if (!currentTrack) {
      isPlayed = false
    } else {
      isPlayed = currentTrack.get('_id') === this.model.get('_id')
    }
    this.$el.toggleClass('playing', isPlayed)
  }

})

export default TrackView
