angular.module( 'riass.broadcasting' )
	.controller( 'SportsDialogCtrl', [ '$scope', '$timeout', 'sportsService', 'notifyService', function ( $scope, $timeout, sportsService, notifyService ){
		var
			dialog = $scope.dialog;

		$scope.cancel = function (){
			dialog.close();
		}
		$scope.selectedItem = {};
		$scope.items = sportsService.getItems();
		$scope.subItems = [];
		$scope.selectedSubItem = {};

		function updateLayout(){
			$timeout(function (){
				$scope.$emit( 'dialogResize' );
			},200)
		}

		$scope.unselectItem = function (){
			$scope.selectedItem = {};
			$scope.selectedSubItem = {};
			$scope.subItems = [];
			updateLayout();
		}

		$scope.selectItem = function ( item ){
			$scope.selectedItem = item;
			$scope.isLoading = true;
			sportsService.loadEvents( item ).then(
				function ( subItems ){
					$scope.subItems = subItems;
					updateLayout();
				},
				function (){
					notifyService.applyMessage({
						text : 'Loading error for ' + item.id,
						type : 'error'
					})
				})
				.finally(function (){
					$scope.isLoading = false;
				})
		}
		$scope.selectSubItem = function ( subItem ){
			$scope.isLoading = true;
			$scope.selectedSubItem = subItem;
			sportsService.saveSelectedEvent( subItem )
				.then(
					function (){
						dialog.close();
						notifyService.applyMessage({
							text : 'Sent'
						})
					},
					function (){
						notifyService.applyMessage({
							text : 'Error saving event ' + subItem.ID_EVENT,
							type : 'error'
						})
					}
				)
				.finally(function (){
					$scope.isLoading = false;
				})
		}

		$scope.reset = function (){
			$scope.isLoading = true;
			sportsService.reset()
				.then(function (){
					dialog.close();
					notifyService.applyMessage({
						text : 'Status reset'
					})
				}, function (){
					notifyService.applyMessage({
						text : 'Error status reset',
						type : 'error'
					})
				})
				.finally(function (){
					$scope.isLoading = false;
				});
		}

		$timeout( dialog.ready, 200 );
	} ]  )