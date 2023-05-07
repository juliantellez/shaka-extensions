import { BehaviourSubject } from "../../Utils/observable"

interface State {

}

class StateManager {
    private state$ = new BehaviourSubject<State>({})
    
}

export {StateManager}
