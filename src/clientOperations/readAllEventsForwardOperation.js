var util = require('util');
var uuid = require('uuid');

var TcpCommand = require('../systemData/tcpCommand');
var ClientMessage = require('../messages/clientMessage');
var ReadDirection = require('../readDirection');
var InspectionResult = require('./../systemData/inspectionResult');
var InspectionDecision = require('../systemData/inspectionDecision');
var results = require('../results');

var OperationBase = require('./operationBase');

function ReadAllEventsForwardOperation(
    log, cb, position, maxCount, resolveLinkTos, requireMaster, userCredentials
) {
  OperationBase.call(this, log, cb, TcpCommand.ReadAllEventsForward, TcpCommand.ReadAllEventsForwardCompleted, userCredentials);
  this._responseType = ClientMessage.ReadAllEventsCompleted;

  this._position = position;
  this._maxCount = maxCount;
  this._resolveLinkTos = resolveLinkTos;
  this._requireMaster = requireMaster;
}
util.inherits(ReadAllEventsForwardOperation, OperationBase);

ReadAllEventsForwardOperation.prototype._createRequestDto = function() {
  return new ClientMessage.ReadAllEvents(this._position.commitPosition, this._position.preparePosition, this._maxCount, this._resolveLinkTos, this._requireMaster);
};

ReadAllEventsForwardOperation.prototype._inspectResponse = function(response) {
  switch (response.result)
  {
    case ClientMessage.ReadAllEventsCompleted.ReadAllResult.Success:
      this._succeed();
      return new InspectionResult(InspectionDecision.EndOperation, "Success");
    case ClientMessage.ReadAllEventsCompleted.ReadAllResult.Error:
      this.fail(new Error("Server error: " + response.error));
      return new InspectionResult(InspectionDecision.EndOperation, "Error");
    case ClientMessage.ReadAllEventsCompleted.ReadAllResult.AccessDenied:
      this.fail(new Error("Read access denied for $all."));
      return new InspectionResult(InspectionDecision.EndOperation, "AccessDenied");
    default:
      throw new Error(util.format("Unexpected ReadStreamResult: %s.", response.result));
  }
};

ReadAllEventsForwardOperation.prototype._transformResponse = function(response) {
  return new results.AllEventsSlice(
      ReadDirection.Forward,
      new results.Position(response.commit_position, response.prepare_position),
      new results.Position(response.next_commit_position, response.next_prepare_position),
      response.events
  )
};

ReadAllEventsForwardOperation.prototype.toString = function() {
  return util.format("Position: %j, MaxCount: %d, ResolveLinkTos: %s, RequireMaster: %s",
      this._position, this._maxCount, this._resolveLinkTos, this._requireMaster);
};

module.exports = ReadAllEventsForwardOperation;