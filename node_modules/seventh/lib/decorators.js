/*
	Seventh

	Copyright (c) 2017 - 2020 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



const Promise = require( './seventh.js' ) ;



Promise.promisifyAll = ( nodeAsyncFn , thisBinding ) => {
	// Little optimization here to have a promisified function as fast as possible
	if ( thisBinding ) {
		return ( ... args ) => {
			return new Promise( ( resolve , reject ) => {
				nodeAsyncFn.call( thisBinding , ... args , ( error , ... cbArgs ) => {
					if ( error ) {
						if ( cbArgs.length && error instanceof Error ) { error.args = cbArgs ; }
						reject( error ) ;
					}
					else {
						resolve( cbArgs ) ;
					}
				} ) ;
			} ) ;
		} ;
	}

	return function( ... args ) {
		return new Promise( ( resolve , reject ) => {
			nodeAsyncFn.call( this , ... args , ( error , ... cbArgs ) => {
				if ( error ) {
					if ( cbArgs.length && error instanceof Error ) { error.args = cbArgs ; }
					reject( error ) ;
				}
				else {
					resolve( cbArgs ) ;
				}
			} ) ;
		} ) ;
	} ;

} ;



// Same than .promisifyAll() but only return the callback args #1 instead of an array of args from #1 to #n
Promise.promisify = ( nodeAsyncFn , thisBinding ) => {
	// Little optimization here to have a promisified function as fast as possible
	if ( thisBinding ) {
		return ( ... args ) => {
			return new Promise( ( resolve , reject ) => {
				nodeAsyncFn.call( thisBinding , ... args , ( error , cbArg ) => {
					if ( error ) {
						if ( cbArg !== undefined && error instanceof Error ) { error.arg = cbArg ; }
						reject( error ) ;
					}
					else {
						resolve( cbArg ) ;
					}
				} ) ;
			} ) ;
		} ;
	}

	return function( ... args ) {
		return new Promise( ( resolve , reject ) => {
			nodeAsyncFn.call( this , ... args , ( error , cbArg ) => {
				if ( error ) {
					if ( cbArg !== undefined && error instanceof Error ) { error.arg = cbArg ; }
					reject( error ) ;
				}
				else {
					resolve( cbArg ) ;
				}
			} ) ;
		} ) ;
	} ;
} ;



/*
	Pass a function that will be called every time the decoratee return something.
*/
Promise.returnValueInterceptor = ( interceptor , asyncFn , thisBinding ) => {
	return function( ... args ) {
		var returnVal = asyncFn.call( thisBinding || this , ... args ) ;
		interceptor( returnVal ) ;
		return returnVal ;
	} ;
} ;



/*
	Run only once, return always the same promise.
*/
Promise.once = ( asyncFn , thisBinding ) => {
	var triggered = false ;
	var result ;

	return function( ... args ) {
		if ( ! triggered ) {
			triggered = true ;
			result = asyncFn.call( thisBinding || this , ... args ) ;
		}

		return result ;
	} ;
} ;



/*
	The decoratee execution does not overlap, multiple calls are serialized.
*/
Promise.serialize = ( asyncFn , thisBinding ) => {
	var lastPromise = new Promise.resolve() ;

	return function( ... args ) {
		var promise = new Promise() ;

		lastPromise.finally( () => {
			Promise.propagate( asyncFn.call( thisBinding || this , ... args ) , promise ) ;
		} ) ;

		lastPromise = promise ;

		return promise ;
	} ;
} ;



/*
	It does nothing if the decoratee is still in progress, but return the promise of the action in progress.
*/
Promise.debounce = ( asyncFn , thisBinding ) => {
	var inProgress = null ;

	const outWrapper = () => {
		inProgress = null ;
	} ;

	return function( ... args ) {
		if ( inProgress ) { return inProgress ; }

		inProgress = asyncFn.call( thisBinding || this , ... args ) ;
		Promise.finally( inProgress , outWrapper ) ;
		return inProgress ;
	} ;
} ;



/*
	Like .debounce(), but subsequent call continue to return the last promise for some extra time after it resolved.
*/
Promise.debounceDelay = ( delay , asyncFn , thisBinding ) => {
	var inProgress = null ;

	const outWrapper = () => {
		setTimeout( () => inProgress = null , delay ) ;
	} ;

	return function( ... args ) {
		if ( inProgress ) { return inProgress ; }

		inProgress = asyncFn.call( thisBinding || this , ... args ) ;
		Promise.finally( inProgress , outWrapper ) ;
		return inProgress ;
	} ;
} ;



/*
	debounceUpdate( [options] , asyncFn , thisBinding ) => {

	It does nothing if the decoratee is still in progress.
	Instead, the decoratee is called again after finishing once and only once, if it was tried one or more time during its progress.
	In case of multiple calls, the arguments of the last call will be used.

	The use case is .update()/.refresh()/.redraw() functions.

	If 'options' is given, it is an object, with:
		* delay: `number` a delay before calling again the decoratee
		* delayFn: async `function` called before calling again the decoratee
		* waitFn: async `function` called before calling the decoratee (even the first try), use-case: Window.requestAnimationFrame()
*/
Promise.debounceUpdate = ( options , asyncFn , thisBinding ) => {
	var inProgress = null ,
		waitInProgress = null ,
		currentUpdateWith = null ,
		currentUpdatePromise = null ,
		nextUpdateWith = null ,
		nextUpdatePromise = null ,
		delay = 0 ,
		delayFn = null ,
		waitFn = null ,
		inWrapper = null ,
		outWrapper = null ;


	// Manage arguments
	if ( typeof options === 'function' ) {
		thisBinding = asyncFn ;
		asyncFn = options ;
	}
	else {
		if ( typeof options.delay === 'number' ) { delay = options.delay ; }
		if ( typeof options.delayFn === 'function' ) { delayFn = options.delayFn ; }
		if ( typeof options.waitFn === 'function' ) { waitFn = options.waitFn ; }
	}


	const nextUpdate = () => {
		inProgress = currentUpdatePromise = null ;

		if ( nextUpdateWith ) {
			let callArgs = nextUpdateWith ;
			nextUpdateWith = null ;
			let sharedPromise = nextUpdatePromise ;
			nextUpdatePromise = null ;

			inProgress = inWrapper( callArgs ) ;
			// Forward the result to the pending promise
			Promise.propagate( inProgress , sharedPromise ) ;
		}
	} ;


	// Build outWrapper
	if ( delayFn ) {
		outWrapper = () => delayFn().then( nextUpdate ) ;
	}
	else if ( delay ) {
		outWrapper = () => setTimeout( nextUpdate , delay ) ;
	}
	else {
		outWrapper = nextUpdate ;
	}


	if ( waitFn ) {
		inWrapper = ( callArgs ) => {
			inProgress = new Promise() ;
			currentUpdateWith = callArgs ;
			waitInProgress = waitFn() ;

			Promise.finally( waitInProgress , () => {
				waitInProgress = null ;
				currentUpdatePromise = asyncFn.call( ... currentUpdateWith ) ;
				Promise.finally( currentUpdatePromise , outWrapper ) ;
				Promise.propagate( currentUpdatePromise , inProgress ) ;
			} ) ;

			return inProgress ;
		} ;

		return function( ... args ) {
			var localThis = thisBinding || this ;

			if ( waitInProgress ) {
				currentUpdateWith = [ localThis , ... args ] ;
				return inProgress ;
			}

			if ( currentUpdatePromise ) {
				if ( ! nextUpdatePromise ) { nextUpdatePromise = new Promise() ; }
				nextUpdateWith = [ localThis , ... args ] ;
				return nextUpdatePromise ;
			}

			return inWrapper( [ localThis , ... args ] ) ;
		} ;
	}

	inWrapper = ( callArgs ) => {
		inProgress = asyncFn.call( ... callArgs ) ;
		Promise.finally( inProgress , outWrapper ) ;
		return inProgress ;
	} ;

	return function( ... args ) {
		var localThis = thisBinding || this ;

		if ( inProgress ) {
			if ( ! nextUpdatePromise ) { nextUpdatePromise = new Promise() ; }
			nextUpdateWith = [ localThis , ... args ] ;
			return nextUpdatePromise ;
		}

		return inWrapper( [ localThis , ... args ] ) ;
	} ;

} ;



// Used to ensure that the sync is done immediately if not busy
Promise.NO_DELAY = {} ;

// Used to ensure that the sync is done immediately if not busy, but for the first of a batch
Promise.BATCH_NO_DELAY = {} ;

/*
	Debounce for synchronization algorithm.
	Get two functions, one for getting from upstream, one for a full sync with upstream (getting AND updating).
	No operation overlap for a given resourceId.
	Depending on the configuration, it is either like .debounce() or like .debounceUpdate().

	*Params:
		fn: the function
		thisBinding: the this binding, if any
		delay: the minimum delay between to call
			for get: nothing is done is the delay is not met, simply return the last promise
			for update/fullSync, it waits for that delay before synchronizing again
		onDebounce: *ONLY* for GET ATM, a callback called when debounced
*/
Promise.debounceSync = ( getParams , fullSyncParams ) => {
	var perResourceData = new Map() ;

	const getResourceData = resourceId => {
		var resourceData = perResourceData.get( resourceId ) ;

		if ( ! resourceData ) {
			resourceData = {
				inProgress: null ,
				inProgressIsFull: null ,
				last: null ,				// Get or full sync promise
				lastTime: null ,			// Get or full sync time
				lastFullSync: null ,		// last full sync promise
				lastFullSyncTime: null ,	// last full sync time
				nextFullSyncPromise: null ,	// the promise for the next fullSync iteration
				nextFullSyncWith: null , 	// the 'this' and arguments for the next fullSync iteration
				noDelayBatches: new Set()		// only the first of the batch has no delay
			} ;

			perResourceData.set( resourceId , resourceData ) ;
		}

		return resourceData ;
	} ;


	const outWrapper = ( resourceData , level ) => {
		// level 2: fullSync, 1: get, 0: nothing but a delay
		var delta , args , sharedPromise , now = new Date() ;
		//lastTime = resourceData.lastTime , lastFullSyncTime = resourceData.lastFullSyncTime ;

		resourceData.inProgress = null ;

		if ( level >= 2 ) { resourceData.lastFullSyncTime = resourceData.lastTime = now ; }
		else if ( level >= 1 ) { resourceData.lastTime = now ; }

		if ( resourceData.nextFullSyncWith ) {
			if ( fullSyncParams.delay && resourceData.lastFullSyncTime && ( delta = now - resourceData.lastFullSyncTime - fullSyncParams.delay ) < 0 ) {
				resourceData.inProgress = Promise.resolveTimeout( -delta + 1 ) ;	// Strangely, sometime it is trigerred 1ms too soon
				resourceData.inProgress.finally( () => outWrapper( resourceData , 0 ) ) ;
				return resourceData.nextFullSyncPromise ;
			}

			args = resourceData.nextFullSyncWith ;
			resourceData.nextFullSyncWith = null ;
			sharedPromise = resourceData.nextFullSyncPromise ;
			resourceData.nextFullSyncPromise = null ;

			// Call the fullSyncParams.fn again
			resourceData.lastFullSync = resourceData.last = resourceData.inProgress = fullSyncParams.fn.call( ... args ) ;

			// Forward the result to the pending promise
			Promise.propagate( resourceData.inProgress , sharedPromise ) ;

			// BTW, trigger again the outWrapper
			Promise.finally( resourceData.inProgress , () => outWrapper( resourceData , 2 ) ) ;

			return resourceData.inProgress ;
		}
	} ;

	const getInWrapper = function( resourceId , ... args ) {
		var noDelay = false ,
			localThis = getParams.thisBinding || this ,
			resourceData = getResourceData( resourceId ) ;

		if ( args[ 0 ] === Promise.NO_DELAY ) {
			noDelay = true ;
			args.shift() ;
		}
		else if ( args[ 0 ] === Promise.BATCH_NO_DELAY ) {
			args.shift() ;
			let batchId = args.shift() ;
			if ( ! resourceData.noDelayBatches.has( batchId ) ) {
				resourceData.noDelayBatches.add( batchId ) ;
				noDelay = true ;
			}
		}

		if ( resourceData.inProgress ) { return resourceData.inProgress ; }

		if ( ! noDelay && getParams.delay && resourceData.lastTime && new Date() - resourceData.lastTime < getParams.delay ) {
			if ( typeof getParams.onDebounce === 'function' ) { getParams.onDebounce( resourceId , ... args ) ; }
			return resourceData.last ;
		}

		resourceData.last = resourceData.inProgress = getParams.fn.call( localThis , resourceId , ... args ) ;
		resourceData.inProgressIsFull = false ;
		Promise.finally( resourceData.inProgress , () => outWrapper( resourceData , 1 ) ) ;
		return resourceData.inProgress ;
	} ;

	const fullSyncInWrapper = function( resourceId , ... args ) {
		var delta ,
			noDelay = false ,
			localThis = fullSyncParams.thisBinding || this ,
			resourceData = getResourceData( resourceId ) ;

		if ( args[ 0 ] === Promise.NO_DELAY ) {
			noDelay = true ;
			args.shift() ;
		}
		else if ( args[ 0 ] === Promise.BATCH_NO_DELAY ) {
			args.shift() ;
			let batchId = args.shift() ;
			if ( ! resourceData.noDelayBatches.has( batchId ) ) {
				resourceData.noDelayBatches.add( batchId ) ;
				noDelay = true ;
			}
		}

		if ( ! resourceData.inProgress && ! noDelay && fullSyncParams.delay && resourceData.lastFullSyncTime && ( delta = new Date() - resourceData.lastFullSyncTime - fullSyncParams.delay ) < 0 ) {
			resourceData.inProgress = Promise.resolveTimeout( -delta + 1 ) ;	// Strangely, sometime it is trigerred 1ms too soon
			Promise.finally( resourceData.inProgress , () => outWrapper( resourceData , 0 ) ) ;
		}

		if ( resourceData.inProgress ) {
			// No difference between in-progress is 'get' or 'fullSync'
			if ( ! resourceData.nextFullSyncPromise ) { resourceData.nextFullSyncPromise = new Promise() ; }
			resourceData.nextFullSyncWith = [ localThis , resourceId , ... args ] ;
			return resourceData.nextFullSyncPromise ;
		}

		resourceData.lastFullSync = resourceData.last = resourceData.inProgress = fullSyncParams.fn.call( localThis , resourceId , ... args ) ;
		Promise.finally( resourceData.inProgress , () => outWrapper( resourceData , 2 ) ) ;
		return resourceData.inProgress ;
	} ;

	return [ getInWrapper , fullSyncInWrapper ] ;
} ;



// The call reject with a timeout error if it takes too much time
Promise.timeout = ( timeout , asyncFn , thisBinding ) => {
	return function( ... args ) {
		var promise = asyncFn.call( thisBinding || this , ... args ) ;
		// Careful: not my promise, so cannot retrieve its status
		setTimeout( () => promise.reject( new Error( 'Timeout' ) ) , timeout ) ;
		return promise ;
	} ;

} ;



// Like .timeout(), but here the timeout value is not passed at creation, but as the first arg of each call
Promise.variableTimeout = ( asyncFn , thisBinding ) => {
	return function( timeout , ... args ) {
		var promise = asyncFn.call( thisBinding || this , ... args ) ;
		// Careful: not my promise, so cannot retrieve its status
		setTimeout( () => promise.reject( new Error( 'Timeout' ) ) , timeout ) ;
		return promise ;
	} ;

} ;

