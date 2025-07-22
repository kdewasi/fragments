const { createErrorResponse, createSuccessResponse } = require('../../src/response');

describe('API Responses', () => {
  test('createErrorResponse()', () => {
    expect(createErrorResponse(404, 'not found')).toEqual({
      status: 'error',
      error: {
        code: 404,
        message: 'not found',
      },
    });
  });

  test('createSuccessResponse()', () => {
    expect(createSuccessResponse()).toEqual({
      status: 'ok',
    });
  });

  test('createSuccessResponse(data)', () => {
    const data = { a: 1, b: 2 };
    expect(createSuccessResponse(data)).toEqual({
      status: 'ok',
      a: 1,
      b: 2,
    });
  });
});
