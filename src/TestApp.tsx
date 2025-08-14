import React from 'react'

function TestApp() {
  return (
    <div style={{ padding: '20px', background: 'lightblue' }}>
      <h1>Test App - React is Working!</h1>
      <p>This is a simple test to verify React is rendering.</p>
      <button onClick={() => alert('Button clicked!')}>Test Button</button>
    </div>
  )
}

export default TestApp
