import { after } from 'fluture'

// dispatcher :: Dispatch -> Action|Action[] -> IO
const dispatcher = dispatch => actions => {
  if (!actions) {
    return
  }

  // An array of actions was returned
  if (actions.constructor === Array) {
    actions.map(dispatch)
    return
  }

  // Just one action was returned
  if (actions.type !== undefined) {
    dispatch(actions)
  }
}

// filterEpic :: Action -> Epic[]|Epic -> Boolean
const filterEpic = action => epic => epic.type.constructor === Array 
  ? epic.type.indexOf(action.type) > -1
  : epic.type === action.type

let counter = 1
const cache = {}

// meatball :: Epic[] -> Store -> Next -> Action -> IO
const meatball = epics => {
  if (!epics || epics.constructor !== Array) {
    throw new Error('MEATBALL EPICS MUST BE AN ARRAY')
  }

  return store => next => action => {

    const result = next(action)
    const postActionState = store.getState()
    const actioner = dispatcher(store.dispatch)

    epics
      .filter(filterEpic(action))
      .forEach(epic => {
        const unsub = epic.debounce
          ? after(epic.debounce, '')
              .chain(() => epic.do(result, postActionState))
              .fork(actioner, actioner)
          : epic.do(result, postActionState).fork(actioner, actioner)

        if (epic.latest || epic.debounce) {
          const id = counter++

          if (cache[epic.type.toString()] && cache[epic.type.toString()].id !== id) {
            cache[epic.type.toString()].unsub()
          }

          cache[epic.type] = { id, unsub }
        }

      })

  }
}

export default meatball