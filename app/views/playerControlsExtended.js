import Mn from 'backbone.marionette';
import application from '../application';


const ControlsExtended = Mn.ItemView.extend({

    template: require('./templates/playerControlsExtended'),

    ui: {
        volumeBar: '#volume-bar',
        shuffle: '#shuffle',
        repeat: '#repeat',
        speaker: '#speaker'
    },

    events: {
        'mousedown @ui.volumeBar': 'changeVol',
        'wheel @ui.volumeBar': 'changeVolWheel',
        'click @ui.shuffle': 'toggleShuffle',
        'click @ui.repeat': 'toggleRepeat',
        'click @ui.speaker': 'toggleVolume'
    },

    modelEvents: {
        'change:currentVolume': 'onVolumeChange',
        'change:mute': 'render',
        'change:repeat': 'render',
        'change:shuffle': 'render',
        'change:currentTrack': 'render'
    },

    initialize() {
        $(document).mousemove((e) => {
            if (this.volumeDown) {
                this.changeVol(e);
            }
        });
        $(document).mouseup((e) => {
            this.volumeDown = false;
        });
        let audio = application.audio;
        let mute = application.appState.get('mute');
         if (mute) {
            audio.volume = 0;
        } else {
            audio.volume = application.appState.get('currentVolume');
        }
    },

    toggleRepeat() {
        let repeat = application.appState.get('repeat');
        switch (repeat) {
            case 'false':
                application.appState.set('repeat', 'track');
                break;
            case 'track':
                application.appState.set('repeat', 'playlist');
                break;
            case 'playlist':
                application.appState.set('repeat', 'false');
                break;
        }
    },

    toggleShuffle() {
        application.channel.trigger('upnext:addCurrentPlaylist');
        let shuffle = application.appState.get('shuffle');
        application.appState.set('shuffle', !shuffle);
    },

    toggleVolume() {
        let audio = application.audio;
        let mute = application.appState.get('mute');
        if (!mute) {
            audio.volume = 0;
        } else {
            audio.volume = application.appState.get('currentVolume');
        }
        application.appState.set('mute', !mute);
    },

    onVolumeChange() {
        let audio = application.audio;
        audio.volume = application.appState.get('currentVolume');
        if (audio.volume <= 0.05) {
            application.appState.set('mute', true);
        } else {
            application.appState.set('mute', false);
        }
        this.render();
    },

    // Change the volume
    changeVol(e) {
        this.volumeDown = true;
        let audio = application.audio;
        let bar = this.ui.volumeBar.get(0);
        let volume = (e.pageX - bar.offsetLeft) / bar.clientWidth;
        if (volume >= 0 && volume <= 1) {
            application.appState.set('currentVolume', volume);
        }
    },

    changeVolWheel(e) {
        const wheelStep = 0.05;
        let volume = application.appState.get('currentVolume', volume);
        if (e.originalEvent.wheelDelta > 0 ) {
            volume += wheelStep;
        } else {
            volume -= wheelStep;
        }

        if (volume > 1) {
            volume = 1;
        } else if (volume < 0) {
            volume = 0;
        }
        application.appState.set('currentVolume', volume);
    },

    serializeData() {
        return _.extend(
            { 'volumePercent': application.audio.volume * 100 + '%' },
            this.model.toJSON()
        );
    }
});

export default ControlsExtended;
