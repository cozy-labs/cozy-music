import Mn from 'backbone.marionette'
import scdl from '../libs/soundcloud'
import PlaylistsView from './playlists'
import NotificationView from './notification'
import application from '../application'

const Toolbar = Mn.LayoutView.extend({

  template: require('./templates/toolbar'),

  ui: {
    importSC: '#import-sc',
    importText: '#import-sc-text',
    search: '#search',
    searchText: '#search-text'
  },

  regions: {
    playlists: '.playlists',
    notification: '[role="notification"]'
  },

  events: {
    'click #sync-files': 'sync',
    'click @ui.importSC': 'importStream',
    'click @ui.search': 'focusInput',
    'focusout @ui.importSC': 'focusoutImportSc',
    'focusout @ui.search': 'focusoutSearch',
    'keyup @ui.importText': 'keyImportScText',
    'keyup @ui.searchText': 'keySearchText'
  },

  onRender () {
    this.showChildView('playlists', new PlaylistsView({
      collection: application.allPlaylists, model: application.appState
    }))

    application.channel.reply('notification', this.showNotification, this)

    this.listenTo(application.channel, 'search:done', () => {
      this.ui.search.removeClass('loading')
    })
  },

  // Import the track when `Enter` is pressed
  keyImportScText (e) {
    e.stopPropagation()
    let url = this.ui.importText.val()
    if (e.keyCode === 13) {
      scdl.import(url)
      this.ui.importText.val('')
      this.focusoutImportSc()
    }
  },

  sync (e) {
    if (e.ctrlKey) {
      application.channel.request('sync', true) // hard sync
    } else {
      application.channel.request('sync')
    }
  },

  debounceSearch: _.debounce((val) => {
    application.router.navigate('search?q=' + val, { trigger: true })
  }, 100),

  keySearchText (e) {
    e.stopPropagation()
    let val = this.ui.searchText.val()
    if (val) {
      this.ui.search.addClass('loading')
      this.debounceSearch(val, this)
    } else {
      application.router.navigate('/tracks', { trigger: true })
    }
  },

  // Show the input
  importStream () {
    this.ui.importSC
            .removeClass('button')
            .addClass('input')
            .addClass('input-focused')
    this.ui.importText.focus()
  },

  // Hide the input
  focusoutImportSc () {
    if (this.ui.importText.val() === '') {
      this.ui.importSC
                .addClass('button')
                .removeClass('input')
                .removeClass('input-focused')
    }
  },

  focusInput () {
    this.ui.search.addClass('input-focused')
  },

  focusoutSearch () {
    if (this.ui.searchText.val() === '') {
      this.ui.search.removeClass('input-focused')
    }
  },

  showNotification (notification) {
    this.showChildView(
            'notification',
            new NotificationView(notification)
        )
  }
})

export default Toolbar
