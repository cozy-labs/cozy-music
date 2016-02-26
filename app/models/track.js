import Backbone from 'backbone';
import scdl from '../libs/soundcloud';


const Track = Backbone.Model.extend({

    defaults: {
        _id: undefined,
        playlists: '',
        metas: '',
        dateAdded: Date.now,
        plays: 0,
        ressource: '',
        hidden: false
    },

    idAttribute:'_id',

    sync: function (method, model, options) {
        switch (method) {
            case 'create':
                cozysdk.create('Track', model.toJSON(), (err, res) => {
                    console.log('CREATE TRACK', err, res);
                });
                break;
            case 'read':
                cozysdk.find('Track', model.get('_id'), (err, res) => {
                    console.log('READ TRACK', err, res);
                 });
                break;
            case 'update':
                cozysdk.updateAttributes(
                    'Track', model.id, model.toJSON(), (err, res) => {
                    console.log('UPDATE TRACK', err, res);
                });
                break;
            case 'delete':
                cozysdk.destroy('Track', model.get('_id'), (err, res) => {
                    console.log('DELETE TRACK', err, res);
                });
                break;
        }
    },

    updatePlays: function () {
        this.set('plays', this.get('plays') +1);
        this.save();
    },

    getStreamURL: function (play) {
        const ressource = this.get('ressource');
        switch (ressource.type) {
            case 'file':
                const id = this.get('ressource').fileID;
                cozysdk.getFileURL(id, 'file', (err, res) => {
                    console.log('FILEURL', err, res);
                    if (res) {
                        res = 'http://' + res.split('@')[1];
                        this.updatePlays();
                        play(res);
                    }
                })
                break;
            case 'soundcloud':
                const url = this.get('ressource').url;
                this.updatePlays();
                play(scdl.addClientID(url));
                break;

        }
    }
});

export default Track;
