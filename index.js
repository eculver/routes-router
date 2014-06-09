var RoutesRouter = require("routes")
var url = require("url")
var methods = require("http-methods")
var extend = require("xtend")
var TypedError = require("error/typed")
var mutableExtend = require("xtend/mutable")

var createDefaultHandler = require("./default-handler.js")

var NotFound = TypedError({
    statusCode: 404,
    message: "resource not found {url}",
    notFound: true
})

function Router(opts) {
    if (!(this instanceof Router)) {
        return new Router(opts)
    }

    opts = opts || {};

    this.defaultHandler = createDefaultHandler(opts)
    var router = this.router = RoutesRouter()
    this.routes = router.routes
    this.routeMap = router.routeMap
    this.match = router.match.bind(router)
}

Router.prototype.addRoute = function addRoute(uri, fn) {
    if (typeof fn === "object") {
        fn = methods(fn)
    }

    this.router.addRoute(uri, fn)
}

Router.prototype.handleRequest =
    function handleRequest(req, res, opts, callback) {
        if (typeof opts === "function") {
            callback = opts
            opts = null
        }

        var self = this
        opts = opts || {}
        callback = callback ||
            this.defaultHandler.createHandler(req, res)

        var pathname

        opts.params = opts.params || {}
        opts.splats = opts.splats || []

        if (opts.splats && opts.splats.length) {
            pathname = opts.splats.pop()
        } else {
            pathname = url.parse(req.url).pathname
        }

        var route = self.router.match(pathname)

        if (!route) {
            return callback(NotFound({
                url: req.url
            }))
        }

        var params = extend(opts, route.params, {
            params: extend(opts.params, route.params),
            splats: opts.splats.concat(route.splats)
        })

        route.fn(req, res, params, callback)
    }

createRouter.Router = Router

module.exports = createRouter

function createRouter(opts) {
    var router = Router(opts)

    var handleRequest = router.handleRequest.bind(router)
    return mutableExtend(handleRequest, router, {
        addRoute: router.addRoute,
        handleRequest: router.handleRequest
    })
}
