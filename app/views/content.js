import Mn from 'backbone.marionette'
import HeaderView from './header'
import TracksView from './tracks'
import application from '../application'

const Content = Mn.LayoutView.extend({

  template: require('./templates/content'),

  regions: {
    header: '[role="complementary"]',
    tracks: '.tracks'
  },

  onBeforeShow () {
    this.showChildView('header', new HeaderView({ model: this.model }))
    this.showChildView('tracks', new TracksView({
      collection: application.allTracks.get('tracks')
    }))
    this.setClass(application.appState.get('currentPlaylist'))
  },

  initialize () {
    this.listenTo(
            application.appState,
      {
        'change:currentPlaylist': this.setClass,
        'change:sort': this.setClass
      }
        )
  },

  // Add Some class used to Display / Hide menu button in track
  setClass () {
    let currentPlaylist = application.appState.get('currentPlaylist')
    let type = currentPlaylist.get('type')
    this.$el.children('.tracks').get(0).className = 'tracks ' + type

    let sort = application.appState.get('sort')
    let isSorted = Boolean(sort.by !== 'default')
    this.$el.children('.tracks').toggleClass('sort', isSorted)
  }
})

export default Content
