(function() {
    'use strict';

    angular
        .module('sound_bound.modal')
        .controller('ErrorModalController', ErrorModalController);

    function ErrorModalController($timeout, close) {
        'ngInject';
        var vm = this;

        vm.close = onClose;
        vm.isClosing = false;
        vm.errorMsg = '';

        function onClose() {
            vm.isClosing = true;
            $timeout(close, 500, true);
        }
    }
})();
