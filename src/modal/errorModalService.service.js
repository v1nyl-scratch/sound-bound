(function() {
    'use strict';

    angular
        .module('sound_bound.modal')
        .factory('errorModalService', errorModalService);

    function errorModalService(ModalService) {
        return new function() {
            var obj = this;

            obj.showError = showError;

            function showError(errorMsg) {
                ModalService.showModal({
                    templateUrl: 'src/modal/errorModal.html',
                    controller: 'ErrorModalController',
                    controllerAs: 'vm'
                }).then(function(modal) {
                    modal.controller.errorMsg = errorMsg;
                });
            }
        }
    };
})();
