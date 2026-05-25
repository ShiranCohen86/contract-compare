let _io = null;

function setIo(io) {
  _io = io;
}

// Emit to a specific user's personal room
function emitToUser(userId, event, data) {
  if (_io && userId) {
    _io.to(`user:${String(userId)}`).emit(event, data);
  }
}

// Emit to all sockets in a contract room
function emitToContract(contractId, event, data) {
  if (_io && contractId) {
    _io.to(`contract:${String(contractId)}`).emit(event, data);
  }
}

module.exports = { setIo, emitToUser, emitToContract };
