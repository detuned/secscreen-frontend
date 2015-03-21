angular.module( 'riass.broadcasting', [ 'riass' ] )
	.run([ '$rootScope', '$window', '$document', 'widgetService', 'CONST', 'imgService', 'broadcastingService',
		function ( $rootScope, $window, $document, widgetService, CONST, imgService, broadcastingService ){
		widgetService.setWidgetTypes( $document.find( 'body' ).data( 'widgetTypes' ) );
		broadcastingService.setBroadcastingData( $document.find( 'body' ).data( 'broadcastingData' ) );
		$rootScope.user = $rootScope.user || $document.find( 'body' ).data( 'userData' );
		$rootScope.getImgUrl = imgService.getImgUrl;

		angular.element( $window ).on( 'beforeunload', function (){
			if ( $rootScope.broadcasting && $rootScope.broadcasting.status == CONST.BROADCASTING_STATUS_ON ){
				return 'Do you really want to leave the page of active broadcasting?';
			}
		});
	}])
	.filter( 'parseTextField', [ '$sce', function ( $sce ){
		return function( input, attach ){
			if ( ! input ){
				return '';
			}
			return input.replace( /\*\*([^\*]+?)\*\*/, function ( a, b ){
				if ( ! attach || ! attach[0] ){
					return b;
				}
				return $sce.trustAsHtml( '<span class="widget_attach_link" data-attach-id="' + attach[0] + '">' + b + '</span>' );
			} )
		}
	}] );