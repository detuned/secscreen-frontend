angular.module( 'riass.broadcasting' )
	.controller( 'PublishDialogCtrl', [ '$scope', '$element', '$compile', '$timeout', 'notifyService', function ( $scope, $element, $compile, $timeout, notifyService ){
		var
			dialog = $scope.dialog,
			viewElement = $element.find( '.publish-dialog_widget' );

		$scope.publishedWidget = dialog.data.widget;
		$scope.isPublishing = false;
		$scope.blockedSeconds = 2;
		$scope.isBlocked = false;

		/* Blocking */
		(function(){
			if ( ! $scope.blockedSeconds ){
				return;
			}
			$scope.isBlocked = true;
			function tick(){
				$scope.blockedSeconds--;
				if ( $scope.blockedSeconds > 0 ){
					$timeout( tick, 1000 );
				}
				else{
					$scope.isBlocked = false;
				}
			}
			$timeout( tick, 1000 );
		})();

		$scope.$on( 'widgetViewReady', function ( event ){
			event.stopPropagation();
			$timeout(function (){
				dialog.ready();
			}, 200);
		});

		$scope.cancel = function (){
			dialog.close();
		}
		$scope.publish = function (){
			if ( $scope.isPublishing || $scope.isBlocked ){
				return;
			}
			$scope.isPublishing = true;

			function onPublishError(){
				notifyService.applyMessage({
					text : 'Widget publication error',
					type : 'error',
					actions : [
						{
							text : 'Repeat'
						}
					]
				})
					.whenAction().then(function (){
						$timeout(function (){
							$scope.publish();
						}, 200)
					});
			}

			if ( $scope.publishedWidget.isPreloaded ){
				$scope.publishedWidget.publish()
					.then(
						function (){
							dialog.close();
						},
						onPublishError
					)
					.finally(function (){
						$scope.isPublishing = false;
					});
			}
			else{
				$scope.publishedWidget.publishClone()
					.then(function (){
						dialog.close();
					}, onPublishError)
					.finally(function (){
						$scope.isPublishing = false;
					});
			}

		}

		dialog.onPressEnter(function ( event ){
			$scope.publish();
		} );

		viewElement.html('<widget-view data-id="' + $scope.publishedWidget.id + '" data-view="full"></widget-view>')
		$compile( viewElement.contents() )( $scope );
	} ]  )