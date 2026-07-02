const hooks = {
    init: () => {
        console.log('Hooks initialized');
    },
    beforeRender: () => {
        console.log('Before render hook');
    },
    afterRender: () => {
        console.log('After render hook');
    }
}