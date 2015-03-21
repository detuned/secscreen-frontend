angular.module( 'riass.broadcasting' )
	.controller( 'ImgeditDialogCtrl', [ '$scope', 'CONST', 'imgService', function ( $scope, CONST, imgService ){
		var
			dialog = $scope.dialog,
			currentImgSize = {},
			currentCropFrame = {};

		$scope.isLoading = false;
		$scope.errorMsg = '';

		/**
		 * Image object to be used by jcrop directive (@see riass/directives.js)
		 * @type {*}
		 */
		$scope.jcropImg = dialog.data.img;

		/**
		 * Options to be used by jcrop directive (@see riass/directives.js)
		 * @type {{aspectRatio: *, minSize: Array, windowOffsetVert: number, ready: Function, onChange: Function, onSelect: Function}}
		 */
		$scope.jcropOptions = {
			aspectRatio      : CONST.IMG_PROD_ASPECT_RATIO,
			minSize          : [ CONST.IMG_PROD_THUMB_MAX ],
			windowOffsetVert : 100, //Reserve for dialog's header
			/**
			 * Should be fired when image loaded
			 * @param imgSize
			 * @param jcropParams
			 */
			ready            : function ( imgSize ){
				currentImgSize = imgSize;
				dialog.ready()
			},
			onChange         : function ( frame ){
				currentCropFrame = frame;
			},
			onSelect         : function ( frame ){
				currentCropFrame = frame;
			}
		}

		$scope.cancel = function (){
			dialog.close();
		}

		$scope.submit = function (){
			$scope.errorMsg = '';
			var resFrame = {};
			resFrame.x = currentCropFrame.x;
			resFrame.y = currentCropFrame.y;

			/*
			 * Sometime Jcrop returns not precise values
			 * (most likely caused by large image zoom)
			 * so we want to be sure that resulted width less
			 * than possible limit
			 */
			resFrame.w = Math.max(
				Math.floor( currentCropFrame.x2 - resFrame.x ),
				Math.min( CONST.IMG_PROD_THUMB_MAX, currentImgSize.width )
			);
			resFrame.h = resFrame.w / $scope.jcropOptions.aspectRatio;

			$scope.isLoading = true;
			imgService.advancedCropImg( $scope.jcropImg, resFrame )
				.then( function ( newImgObject ){
					dialog.done( newImgObject );
				}, function ( res ){
					// Error
					$scope.errorMsg = 'Image crop doesn`t work at demo version';
				} )
				.finally( function (){
					$scope.isLoading = false;
				} )
		}

	} ] )