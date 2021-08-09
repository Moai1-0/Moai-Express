const user = require('../../controllers/user');
const httpMocks = require('node-mocks-http');
const newUser = require('../data/new-user.json');

let, req, res, next;

beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    next = null;
})

describe("Product Controller", () => {
    it("should have a getProducts function", () => {
        expect(typeof user.getProducts).toBe("function");
    })

})