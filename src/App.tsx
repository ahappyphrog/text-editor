import { useState } from 'react'
import TextEditor from './components/TextEditor'
import ThemeToggle from './components/ThemeToggle'
import './App.css'

function App() {
  const [_content, setContent] = useState<string>('')

  const handleValueChange = (value: string) => {
    setContent(value)
    console.log('Editor content:', value)
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1 className="app-title">WYSIWYG Editor</h1>
            <p className="app-subtitle">A simple way to edit your content with rich formatting options</p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="editor-wrapper">
        <TextEditor 
          defaultValue="<p>Start typing here...</p>"
          placeholder="Enter your content..." 
          onValueChange={handleValueChange} 
        />
      </div>
      
      <div style={{ height: '20px', width: '100%' }}></div>
    </div>
  )
}

export default App
