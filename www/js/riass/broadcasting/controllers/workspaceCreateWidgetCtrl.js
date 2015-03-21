angular.module( 'riass.broadcasting' )
	.controller( 'WorkspaceCreateWidgetCtrl', [ '$scope', '$rootScope', '$filter', 'workspaceService', 'widgetService', function ( $scope, $rootScope, $filter, workspaceService, widgetService ){
//		var types = widgetService.getAllTypes();
		var
			configTypes = $rootScope.CONFIG.widgetTypes,
			types = [],
			typesById = {};

		if ( configTypes && configTypes.length ){
			/* Completing widget types from config by base widgets data */
			angular.forEach( configTypes, function ( widgetType ){
				var type;
				if ( ! widgetType.type ){
					return;
				}
				if ( widgetType.type  ){
					type = angular.extend( {}, widgetService.getType( widgetType.type ) || {}, _.omit( widgetType, 'id' ) );
					type.name = widgetType.type;
					types.push( type );
				}
			});
		}
		else{
			types = widgetService.getAllTypes();
		}

		angular.forEach( types || [], function ( type, typeId ){
			type.typeId = typeId;
			typesById[ typeId ] = type;
		})

		$scope.types = types;

		$scope.filteredTypes = types;
		$scope.$watch( 'search', function ( v ){
			$scope.filteredTypes = $filter( 'filter' )( $scope.types, v );
			if ( $scope.filteredTypes[0] ){
				$scope.selectedTypeId = $scope.filteredTypes[0].typeId;
			}
		})

		$scope.selectedTypeId = 0;
		$scope.selectType = function ( typeId ){
			$scope.selectedTypeId = typeId;
		}
		$scope.createWidget = function (){
			var
				selectedType = typesById[$scope.selectedTypeId],
				tags = [];
			if ( $rootScope.broadcasting && angular.isArray( $rootScope.broadcasting.tags ) ){
				/**
				 * By default widget creates with broadcasting tags
				 */
				tags = $rootScope.broadcasting.tags;
			}
			if ( angular.isArray( selectedType.tags ) && selectedType.tags.length ){
				/* For this widget type tags has defined in config, let's use'em */
				if ( selectedType.tags[0] === true ){
					/*
					 * First element of config tags set to 'true', what means that
					 * we need to ignore broadcasting tags and to add only specified
					 */
					tags = [];

					/**
					 * 'True' itself need to be ignored of course, it's only sign not tag
					 */
					selectedType.tags.shift();
				}
				tags = tags.concat( selectedType.tags );
			}
			tags = _.uniq( tags );
			var widget = widgetService.getWidget( {
				type : selectedType.name,
				fields : selectedType.fields,
				tags : tags
			} );
			widget.whenLoaded().then(function (){
				var newWsWidget = workspaceService.changeWidget( $scope.wsWidget, widget );
				newWsWidget.fresh = true;
				if ( ! $scope.$$phase ){
					$scope.$apply();
				}
			});
		}

	}])