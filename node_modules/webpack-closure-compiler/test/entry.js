import preact from 'preact';
import render from 'preact-render-to-string';

const { h, Component } = preact;

const H1 = ({ children }) => h('h1', null, children);

class App extends Component {
  render() {
    return h('div', null, h(H1, null, 'Hello, world!'));
  }
}

console.log(render(h(App)));
