angular.module( 'riass.broadcasting' )
	.controller( 'FeedCtrl', [ '$scope', 'feedService', function ( $scope, feedService ){
		var isListReady = false;
		$scope.items = feedService.getItems();
		$scope.state = feedService.state;

		$scope.onCapacityChange = function ( capacity ){
			feedService.limit = capacity;
			if ( ! isListReady ){
				feedService.whenReady().then(function (){
					feedService.update();
				});
				isListReady = true;
			}
		}

		$scope.loadMore = function (){
			if ( isListReady && ! $scope.state.loading ){
				feedService.loadMore();
			}
		}

		$scope.isDataAvailable = feedService.isDataAvailable;

	}]);