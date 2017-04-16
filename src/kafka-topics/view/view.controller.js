angularAPP.controller('ViewTopicCtrl', function ($scope, $routeParams, $rootScope, $filter, $log, $location,$cookies, $http, TopicFactory, env, $q, $timeout , consumerFactory, HttpFactory) {

  $log.debug($routeParams.topicName, "Starting [ViewTopicCtrl]");

  var topicName = $routeParams.topicName;
  var selectedTabIndex = $routeParams.selectedTabIndex;
  var topicCategoryUrl = $routeParams.topicCategoryUrl;
  var topicMenuItem = $routeParams.menuItem;

  $scope.showSpinner = true;
  $scope.showAdvanced = false;

      //TODO add error messages for failed requrests + false spinner
      TopicFactory.getTopicSummary(topicName, $scope.cluster.KAFKA_REST)
      .then(function success(topic){
            topic.data.configs = makeConfigsArray(topic.data.configs);
            $scope.topic = topic.data;
            $scope.showAdvanced = ($scope.topic.partitions.length == 1 ? true : false )
            $scope.disableAllPartitionButtons = ($scope.topic.partitions.length == 1 ? true : false )
      },
     function failure(responseError2) {
     });

    TopicFactory.getAllTopics($scope.cluster.KAFKA_REST) //TODO do we need this?
    .then(function success(allTopics){
      $scope.allTopics = allTopics;
    });

  $scope.showOrHideAdvanced = 'Show advanced';

  $scope.disableAllPartitionButtons = false;
  $scope.toggleAdvanced = function(){
  if($scope.showAdvanced)
    $scope.showOrHideAdvanced = 'Show advanced';
    else
    $scope.showOrHideAdvanced = 'Hide advanced';

    $scope.showAdvanced = !$scope.showAdvanced
  }
/*******************************
 * topic-toolbar.html
********************************/

  $scope.showDownloadDiv = false;

  $scope.toggleList = function () {
     $rootScope.showList = !$rootScope.showList;
  };

  $scope.downloadData = function (topicName, data) {
    $log.info("Download requested for " + data.length + " bytes ");
    var json = data;
    console.log(data)
    var blob = new Blob([json], {type: "application/json;charset=utf-8;"});
    var downloadLink = angular.element('<a></a>');
    downloadLink.attr('href', window.URL.createObjectURL(blob));
    downloadLink.attr('download', topicName + '.json');
    downloadLink[0].click();
  };

/*******************************
 * AUTO COMPLETE
********************************/
  $scope.simulateQuery = false;

  $scope.querySearch = function querySearch (query) {
    var results = query ? $scope.allTopics.filter( createFilterFor(query) ) : $scope.allTopics,
        deferred;
    if ($scope.simulateQuery) {
      deferred = $q.defer();
      $timeout(function () { deferred.resolve( results ); }, Math.random() * 1000, false);
      return deferred.promise;
    } else {
      return results;
    }
  }
  $scope.goTo = function goTo (topic) {
   var urlType = (topic.isControlTopic == true) ? 'c' : 'n';
    $location.path ("cluster/"+ $scope.cluster.NAME + "/topic/" +  urlType + "/" + topic.topicName);
  }
  function createFilterFor(query) {
    var lowercaseQuery = angular.lowercase(query);

    return function filterFn(item) {
      return (item.topicName.indexOf(lowercaseQuery) === 0);
    };

  }

/*******************************
 * topic-overview.html / partition
********************************/


/*******************************
 * topic-configuration.html
********************************/

  $scope.showMoreDesc = [];

  $scope.toggleMoreDesc = function (index) {
      $scope.showMoreDesc[index] = !$scope.showMoreDesc[index];
  };

  function makeConfigsArray(configs) {
//    configs = {"segment.bytes":"104857600","cleanup.policy":"compact","compression.type":"producer"};
    var configArray = [];
    angular.forEach(configs, function(value, key) {
          var object = {
            configuration : key,
            value : value,
            defaultValue : "abc",
            documentation : "defsdsdsdsdsd"
          };
          this.push(object);
    }, configArray);
    return configArray;
  }

/*******************************
 * topic data / advanced / slider
********************************/

//$scope.slider = {
//    minValue: 40,
//    maxValue: 60,
//    options: {
//        floor: 0,
//        ceil: 1000000,
//        step: 1,
//        minRange: 10,
//        maxRange: 30,
//        pushRange: true
//    }
//};

//
//$scope.slider = {
//  minValue: 10,
//  maxValue: 90,
//  options: {
//    floor: 0,
//    ceil: 100,
//  }
//};
//TODO
$scope.slider = {
       minValue: 123,
       maxValue: 156,
       options: {
         floor: 123,//allData[0].offset,
         ceil: 234//allData[allData.length - 1].offset,
       }
     };

/*******************************
 * topic data / Tabs handling
********************************/

  $scope.selectedTabNnumber = setSelectedDataTab(selectedTabIndex);

  function setSelectedDataTab(selectedTabIndex) {
    switch(selectedTabIndex) {
        case "topic": return 0;
        case "table": return 1;
        case "rawdata": return 2;
        default: return 0;
    }
  }

  $scope.selectedMenuItem = (topicMenuItem != undefined) ? topicMenuItem : 'data';

  $scope.setMenuSelection = function(currentMenuItem, cluster) {
        $scope.selectedMenuItem = currentMenuItem;
        $location.path("cluster/"+ cluster.NAME + "/topic/" +  topicCategoryUrl + "/" + topicName + "/" + currentMenuItem, false);
  }

  $scope.onTabChanges = function(currentTabIndex, cluster){
      $location.path ("cluster/"+ cluster.NAME + "/topic/" +  topicCategoryUrl + "/" + topicName +  "/" + $scope.selectedMenuItem + "/" + currentTabIndex, false);
  };


  $scope.maxHeight = window.innerHeight - 215;
    if ($scope.maxHeight < 310) {$scope.maxHeight = 310}
/*******************************
 * still Depends on Kafka Rest
********************************/

  /****************** SUPER CLEAN UP REQUIRED HERE / STARTS (this is the only dep to KAFKA_REST) *****************/
  //If data is empty don't try to deserialize

  function setTopicMessages(allData, format, forPartition) {

    if(forPartition) {
//       $scope.showSpinner = false;
        //if(firstTime) { console.log('IS FIRST'); $scope.firstOffsetForPartition = allData.data[0].offset }
        $scope.showAdvanced = true;
        $scope.disableAllPartitionButtons = true;
        $scope.showEmptyPartition = true;

    }

     $scope.rows = allData;
     $scope.format=format;
       $scope.showSpinner = false;

//       if(format=='binary') {
//         $scope.hideTab = true;
//       }


    if(allData.length > 0) {

     var floor = $scope.firstOffsetForPartition ? $scope.firstOffsetForPartition : allData[0].offset;

     $scope.slider = {
       id : 'slider-id',
       minValue: allData[0].offset,
       maxValue: allData[allData.length - 1].offset,
       options: {
         floor: floor,
         ceil: allData[allData.length - 1].offset + 100,
         draggableRangeOnly: true,
         onChange: function() {
               console.log('on change ', $scope.slider.minValue); // logs 'on end slider-id'
         },
         onEnd: function(){
             console.log('on end ', $scope.slider.minValue, $scope.selectedPartition); //TODO
             $scope.assignPartitions($scope.selectedPartition, $scope.slider.minValue, false)
         }
       }
     };
     }
  }

  function getDeserializationErrorMessage(reason, type) {
      return $log.debug('Failed with '+ type +' type :(  (' + reason + ')');
  }

  createAndFetch(consumerFactory.getConsumerType(topicName), topicName);
  $scope.hideTab = false;

  function createAndFetch(format, topicName) {
    $log.debug("... DATA FOR PARTITION [ ALL ]...")
    $scope.uuid = consumerFactory.genUUID();
    consumerFactory
        .createConsumer(format, topicName, $scope.uuid)
        .then(function(res){
            return consumerFactory.getConsumer(format, $scope.uuid);
        })
        .then(function(consumer) {
            consumerFactory.getDataFromBeginning(consumer, format, topicName).then(function (allData) {
                if(allData == -1) {
                    $log.debug(topicName, "FAILED TO GET DATA, NEED TO RETRY", allData, $scope.consumer, topicName);
                    createAndFetch(consumerFactory.getConsumerTypeRetry(format, topicName), topicName);
                } else {
                      $log.debug(topicName, "GOT DATA, WILL RENDER", " [", allData.data.length, "] [", format, "] MESSAGES");
                      setTopicMessages(allData.data, format, false)
                }
            });
        });
  }

  $scope.assignPartitions = function assignPartitions (partition, offset, firstTime) {

    $log.debug("... DATA FOR PARTITION [" + partition + "]...")
    //TODO If partitions = all (somehow) then createAndFetch
    //TODO make a loading for data only for the case partition is empty// $scope.showSpinner = true;
    var partition = [ { "partition" : partition } ] //create array because assignments works for all too.
    var format = consumerFactory.getConsumerType(topicName);//$scope.format; //TODO
    if (!angular.isDefined(offset)){offset = 1}
    $scope.uuid = consumerFactory.genUUID();

    consumerFactory
        .createConsumer(format, topicName, $scope.uuid)
        .then(function(res){
            return consumerFactory.getConsumer(format, $scope.uuid);
        })
        .then(function(consumer) {

            $log.debug(topicName, "1) GOT PARTITION", partition)
//            consumerFactory.postConsumerAssignments(consumer, topicName, partition).then(function (responseAssign){
//              consumerFactory.postConsumerPositions(consumer, topicName, partition[0], offset).then(function(responseOffset){
//                consumerFactory.getRecords(consumer, format)
                consumerFactory.getDataForPartition(topicName, consumer, format, partition, offset)
                .then(function(allData) {
                    if(allData != -1) {
                        if(firstTime) { $scope.firstOffsetForPartition = allData.data[0].offset }
                        setTopicMessages(allData.data, format, true);
                    } else {
                        $scope.cannotGetDataForPartition = "Cannot get data for partition [" + partitions + "]. Please refresh."
                    }
//                })
//              })
            })
        });



//    consumerFactory.postConsumerAssignments($scope.consumer, topicName, part).then(function (responseAssign){
//
////          $log.debug("Checking assignments for :", $scope.consumer);
////          var url_tmp = env.KAFKA_REST().trim() + '/consumers/' + $scope.consumer.group + '/instances/' + $scope.consumer.instance + '/assignments'
////          HttpFactory.req('GET', url_tmp, '', '', '', false, true).then(function(res){
////          console.log("Existing assignments ", res);
//
//          consumerFactory.postConsumerPositions($scope.consumer, topicName, partitions, offset).then(function(responseOffset){
//            consumerFactory.getRecords($scope.consumer, $scope.format).then(function(allData){
//              setTopicMessages(allData.data)
//    //          $scope.showSpinner = false;
//                if(firstTime) { console.log('IS FIRST');$scope.firstOffsetForPartition = allData.data[0].offset }
//                $scope.showAdvanced = true;
//                $scope.disableAllPartitionButtons = true;
//                $scope.showEmptyPartition = true;
//            }).then(consumerFactory.deleteConsumerSubscriptions($scope.consumer))
//          })
//
////      })
//
//    })


  }

});


angularAPP.factory('TopicFactory', function (HttpFactory) {
    var defaultContentType = 'application/vnd.kafka.avro.v2+json';

    return {
          getTopicSummary: function (topicName, endpoint) {
             return HttpFactory.req('GET', endpoint  + '/topics/' + topicName);
          },
          getAllTopics: function(endpoint) {
            return HttpFactory.req('GET', endpoint + "/topics")
          }
    }
});


//BACKUP WITH CHECK //TODO deleteme
//function createAndFetch(format, topicName) {
//    $scope.uuid = consumerFactory.genUUID();
//    consumerFactory
//        .createConsumer(format, topicName, $scope.uuid)
//        .then(function(res){
//            return consumerFactory.getConsumer(format, $scope.uuid);
//        })
//        .then(function(consumer) {
//             //TODO what if there are? At which conditions? should put in factory?
//             var url_tmp = env.KAFKA_REST().trim() + '/consumers/' + consumer.group + '/instances/' + consumer.instance + '/assignments'
//             HttpFactory.req('GET', url_tmp, '', '', '', false, false).then(function(res){
//                   if(res.data.length > 0) $log.warn(topicName, "EXISTING ASSIGNMENTS", res.data);
//             })
//            return consumer;
//        })
//        .then(function(consumer) {
//            consumerFactory.getDataFromBeginning(consumer, format, topicName).then(function (allData) {
//                if(allData == -1) {
//                    $log.debug(topicName, "FAILED TO GET DATA, NEED TO RETRY", allData, $scope.consumer, topicName);
//                    createAndFetch(consumerFactory.getConsumerTypeRetry(format, topicName), topicName);
//                } else {
//                      $log.debug(topicName, "GOT DATA, WILL RENDER", " [", allData.data.length, "] [", format, "] MESSAGES");
//                      setTopicMessages(allData.data, format)
//                }
//            });
//        });
//  }