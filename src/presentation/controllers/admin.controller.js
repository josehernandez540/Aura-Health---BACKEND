import { successResponse } from '../../shared/utils/apiResponse.js';

class AdminController {
  async getInfo(req, res, next) {
    return successResponse(res, {
      message: "Información de administrador"
    });
  }
}

export default new AdminController();