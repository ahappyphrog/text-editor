import React, { useState, useRef, useEffect } from 'react';
import { ReactComponent as UndoIcon } from '../assets/icons/undo.svg';
import { ReactComponent as RedoIcon } from '../assets/icons/redo.svg';
import { ReactComponent as BoldIcon } from '../assets/icons/bold.svg';
import { ReactComponent as ItalicIcon } from '../assets/icons/italic.svg';
import { ReactComponent as UnderlineIcon } from '../assets/icons/underline.svg';
import { ReactComponent as StrikethroughIcon } from '../assets/icons/strikethrough.svg';
import { ReactComponent as OrderedListIcon } from '../assets/icons/ordered-list.svg';
import { ReactComponent as UnorderedListIcon } from '../assets/icons/unordered-list.svg';
import { ReactComponent as CheckIcon } from '../assets/icons/check.svg';
import { ReactComponent as CopyIcon } from '../assets/icons/copy.svg';
import { ReactComponent as ChevronDownIcon } from '../assets/icons/chevron-down.svg';

export interface TextEditorProps {
  defaultValue?: string;
  placeholder?: string;
  onValueChange?: (value: string) => void;
}

// Custom dropdown component
interface CustomDropdownProps {
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  className?: string;
  title?: string;
  ariaLabel?: string;
  style?: React.CSSProperties;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  options,
  onChange,
  className,
  title,
  ariaLabel,
  style
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(options[0]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen && optionsRef.current) {
      // Find the selected option element
      const selectedElement = optionsRef.current.querySelector('.selected');
      if (selectedElement) {
        // Scroll to the selected option
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [isOpen]);

  const handleOptionClick = (option: { value: string; label: string }) => {
    setSelectedOption(option);
    setIsOpen(false);
    onChange(option.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        setIsOpen(!isOpen);
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'ArrowDown':
        if (isOpen) {
          e.preventDefault();
          const currentIndex = options.findIndex(opt => opt.value === selectedOption.value);
          const nextIndex = (currentIndex + 1) % options.length;
          const nextOption = options[nextIndex];
          setSelectedOption(nextOption);
        } else {
          setIsOpen(true);
        }
        break;
      case 'ArrowUp':
        if (isOpen) {
          e.preventDefault();
          const currentIndex = options.findIndex(opt => opt.value === selectedOption.value);
          const prevIndex = (currentIndex - 1 + options.length) % options.length;
          const prevOption = options[prevIndex];
          setSelectedOption(prevOption);
        } else {
          setIsOpen(true);
        }
        break;
      case 'Tab':
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div 
      ref={dropdownRef}
      className={`custom-dropdown ${className || ''}`} 
      style={style}
      title={title}
      aria-label={ariaLabel}
      aria-expanded={isOpen}
      tabIndex={0}
      role="combobox"
      aria-controls="dropdown-options"
      aria-haspopup="listbox"
      onKeyDown={handleKeyDown}
    >
      <div 
        className="dropdown-header" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="dropdown-label">{selectedOption.label}</span>
        <ChevronDownIcon className="icon-current dropdown-arrow" />
      </div>
      {isOpen && (
        <div 
          ref={optionsRef}
          className="dropdown-options" 
          id="dropdown-options"
          role="listbox"
        >
          {options.map((option) => (
            <div
              key={option.value}
              className={`dropdown-option ${selectedOption.value === option.value ? 'selected' : ''}`}
              onClick={() => handleOptionClick(option)}
              role="option"
              aria-selected={selectedOption.value === option.value}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const TextEditor: React.FC<TextEditorProps> = ({
  defaultValue = '',
  placeholder = '',
  onValueChange,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState<string>(defaultValue);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrike, setIsStrike] = useState(false);
  const [isOrderedList, setIsOrderedList] = useState(false);
  const [isUnorderedList, setIsUnorderedList] = useState(false);
  const [htmlCopied, setHtmlCopied] = useState(false);
  const [markdownCopied, setMarkdownCopied] = useState(false);
  const [history, setHistory] = useState<{content: string}[]>([{content: defaultValue}]);
  const [historyIndex, setHistoryIndex] = useState(0);
  // For batching changes
  const [lastChangeTime, setLastChangeTime] = useState<number>(0);
  const changeTimeoutRef = useRef<number | null>(null);
  const batchChangeDuration = 300; // Reduced from 800ms to 300ms for smaller batches
  const isUndoDisabled = historyIndex <= 0;
  const isRedoDisabled = historyIndex >= history.length - 1;
  // For cursor position preservation
  const selectionStateRef = useRef<{
    startContainer: Node | null;
    startOffset: number;
    endContainer: Node | null;
    endOffset: number;
  } | null>(null);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = defaultValue;
    }
  }, [defaultValue]);

  // Add event listeners for keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle tab in lists for indentation
      if (e.key === 'Tab' && (isOrderedList || isUnorderedList) && editorRef.current) {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        
        // Prevent default tab behavior
        e.preventDefault();
        
        // Find the list item element
        let node = selection.anchorNode;
        let listItem = null;
        
        // Navigate up the DOM tree to find the LI element
        while (node && node !== editorRef.current) {
          if (node.nodeName === 'LI') {
            listItem = node;
            break;
          }
          node = node.parentNode;
        }
        
        if (listItem) {
          // If shift is pressed, outdent
          if (e.shiftKey) {
            document.execCommand('outdent', false);
          } else {
            document.execCommand('indent', false);
          }
          
          // Update content state
          if (editorRef.current) {
            const content = editorRef.current.innerHTML;
            setHtml(content);
            if (onValueChange) {
              onValueChange(content);
            }
            addToHistory(content);
          }
        }
      }
      
      // Existing handling for ctrl+key combinations
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault();
            toggleBold();
            break;
          case 'i':
            e.preventDefault();
            toggleItalic();
            break;
          case 'u':
            e.preventDefault();
            toggleUnderline();
            break;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              // Ctrl+Shift+Z for redo
              redo();
            } else {
              // Ctrl+Z for undo
              undo();
            }
            break;
          case 'y':
            e.preventDefault();
            // Ctrl+Y for redo
            redo();
            break;
          default:
            break;
        }
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Remove event listener on cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isBold, isItalic, isUnderline, isStrike, historyIndex, isOrderedList, isUnorderedList]); // Re-bind when state changes

  // Check formatting state
  const checkFormatting = () => {
    if (document.queryCommandState) {
      // Check if the current selection is within a heading element
      const isInHeading = isSelectionInHeading();
      
      // Only set bold state if not in a heading
      setIsBold(!isInHeading && document.queryCommandState('bold'));
      setIsItalic(document.queryCommandState('italic'));
      setIsUnderline(document.queryCommandState('underline'));
      setIsStrike(document.queryCommandState('strikeThrough'));
      setIsOrderedList(document.queryCommandState('insertOrderedList'));
      setIsUnorderedList(document.queryCommandState('insertUnorderedList'));
    }
  };

  // Check if current selection is within a heading element
  const isSelectionInHeading = () => {
    if (!window.getSelection) return false;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    
    const node = selection.getRangeAt(0).commonAncestorContainer;
    
    // Check if the node itself or its parent is a heading
    const element = node.nodeType === 3 ? node.parentElement : node as HTMLElement;
    if (!element) return false;
    
    const tagName = element.tagName.toLowerCase();
    if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3' || 
        tagName === 'h4' || tagName === 'h5' || tagName === 'h6') {
      return true;
    }
    
    // Check if any parent is a heading
    let parent = element.parentElement;
    while (parent) {
      const parentTag = parent.tagName.toLowerCase();
      if (parentTag === 'h1' || parentTag === 'h2' || parentTag === 'h3' || 
          parentTag === 'h4' || parentTag === 'h5' || parentTag === 'h6') {
        return true;
      }
      parent = parent.parentElement;
    }
    
    return false;
  };

  // Add to history with batching
  const addToHistory = (content: string) => {
    const now = Date.now();
    
    // Clear any pending timeout
    if (changeTimeoutRef.current !== null) {
      window.clearTimeout(changeTimeoutRef.current);
      changeTimeoutRef.current = null;
    }
    
    // If the time since last change is greater than batch duration, add immediately
    const timeSinceLastChange = now - lastChangeTime;
    if (timeSinceLastChange > batchChangeDuration) {
      // Only add if it's different from the current state
      if (historyIndex < history.length - 1) {
        // If we're in the middle of the history, truncate it
        setHistory(prevHistory => prevHistory.slice(0, historyIndex + 1));
      }
      
      // Don't add duplicate states
      if (history[historyIndex]?.content !== content) {
        setHistory(prevHistory => [...prevHistory, {content}]);
        setHistoryIndex(prevIndex => prevIndex + 1);
      }
      
      // Update the last change time
      setLastChangeTime(now);
      return;
    }
    
    // Set a timeout to add to history after batch duration
    changeTimeoutRef.current = window.setTimeout(() => {
      // Only add if it's different from the current state
      if (historyIndex < history.length - 1) {
        // If we're in the middle of the history, truncate it
        setHistory(prevHistory => prevHistory.slice(0, historyIndex + 1));
      }
      
      // Don't add duplicate states
      if (history[historyIndex]?.content !== content) {
        setHistory(prevHistory => [...prevHistory, {content}]);
        setHistoryIndex(prevIndex => prevIndex + 1);
      }
      
      // Reset the timeout reference
      changeTimeoutRef.current = null;
      
      // Update the last change time
      setLastChangeTime(now);
    }, batchChangeDuration - timeSinceLastChange);
  };

  // Save the current selection state
  const saveSelectionState = () => {
    if (!window.getSelection || !editorRef.current) return;
    
    try {
      const selection = window.getSelection();
      if (!selection || !selection.rangeCount) return;
      
      const range = selection.getRangeAt(0);
      
      // Store the selection state in the ref
      selectionStateRef.current = {
        startContainer: range.startContainer,
        startOffset: range.startOffset,
        endContainer: range.endContainer,
        endOffset: range.endOffset
      };
    } catch (e) {
      console.error('Error saving selection state:', e);
    }
  };

  // Restore the saved selection state
  const restoreSelectionState = () => {
    if (!window.getSelection || !selectionStateRef.current || !editorRef.current) return;
    
    try {
      // Make sure editor has focus first
      editorRef.current.focus();
      
      // Get current selection
      const selection = window.getSelection();
      if (!selection) return;
      
      // Clear existing selections
      selection.removeAllRanges();
      
      const startContainer = selectionStateRef.current.startContainer;
      const endContainer = selectionStateRef.current.endContainer;
      
      // If we can't find the original selection points, place cursor at the end
      if (!startContainer || !endContainer || 
          !editorRef.current.contains(startContainer) || 
          !editorRef.current.contains(endContainer)) {
        
        // Create a range at the end of the editor content
        const range = document.createRange();
        const lastChild = getLastTextNode(editorRef.current);
        
        if (lastChild) {
          range.setStart(lastChild, lastChild.textContent?.length || 0);
          range.setEnd(lastChild, lastChild.textContent?.length || 0);
        } else {
          // If no text nodes, place at beginning of editor
          range.setStart(editorRef.current, 0);
          range.setEnd(editorRef.current, 0);
        }
        
        selection.addRange(range);
        return;
      }
      
      // Create a new range with the saved selection
      const range = document.createRange();
      range.setStart(startContainer, selectionStateRef.current.startOffset);
      range.setEnd(endContainer, selectionStateRef.current.endOffset);
      selection.addRange(range);
    } catch (e) {
      // If restoration fails, place cursor at end
      placeCursorAtEnd();
    }
  };
  
  // Find the last text node or suitable node for cursor placement
  const getLastTextNode = (node: Node): Node | null => {
    if (!node) return null;
    
    // If this is a text node with content or an empty text node, return it
    if (node.nodeType === Node.TEXT_NODE) {
      return node;
    }
    
    // Special case for BR elements - we can place cursor before these
    if (node.nodeName === 'BR') {
      return node;
    }
    
    // Traverse child nodes from last to first
    if (node.childNodes.length > 0) {
      for (let i = node.childNodes.length - 1; i >= 0; i--) {
        const lastNode = getLastTextNode(node.childNodes[i]);
        if (lastNode) return lastNode;
      }
    }
    
    // If no suitable text node found but element can contain text, return the element itself
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      // Elements that commonly contain text or can have cursor
      if (['P', 'DIV', 'SPAN', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI'].includes(el.nodeName)) {
        return node;
      }
    }
    
    return null;
  };

  // Place cursor at end of content
  const placeCursorAtEnd = () => {
    if (!editorRef.current || !window.getSelection) return;
    
    try {
      const selection = window.getSelection();
      if (!selection) return;
      
      const range = document.createRange();
      let target: Node | null = null;
      let offset = 0;
      
      // First try to find the last text node
      const lastNode = getLastTextNode(editorRef.current);
      
      if (lastNode) {
        if (lastNode.nodeType === Node.TEXT_NODE) {
          // For text nodes, place at the end of the text
          target = lastNode;
          offset = lastNode.textContent?.length || 0;
        } else if (lastNode.nodeName === 'BR') {
          // For BR elements, place before the BR
          target = lastNode.parentNode;
          // Find the index of the BR among its siblings
          if (target) {
            for (let i = 0; i < target.childNodes.length; i++) {
              if (target.childNodes[i] === lastNode) {
                offset = i;
                break;
              }
            }
          }
        } else {
          // For other elements, place at the end of the element
          target = lastNode;
          offset = lastNode.childNodes.length;
        }
      } else {
        // Fallback to the editor container itself
        target = editorRef.current;
        offset = editorRef.current.childNodes.length;
      }
      
      if (target) {
        // Clear existing selection and set the new one
        selection.removeAllRanges();
        range.setStart(target, offset);
        range.setEnd(target, offset);
        selection.addRange(range);
        
        // Make sure editor is focused
        editorRef.current.focus();
      }
    } catch (e) {
      console.error('Error placing cursor at end:', e);
    }
  };

  const undo = () => {
    if (historyIndex > 0) {
      // Focus editor first to prevent flicker
      if (editorRef.current) {
        editorRef.current.focus();
      }
      
      // Save selection before changing content
      saveSelectionState();
      
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      
      if (editorRef.current && history[newIndex]) {
        const historyItem = history[newIndex];
        
        // Apply content without adding to history
        editorRef.current.innerHTML = historyItem.content;
        setHtml(historyItem.content);
        
        if (onValueChange) {
          onValueChange(historyItem.content);
        }
        
        // Use requestAnimationFrame for better timing with DOM updates
        window.requestAnimationFrame(() => {
          restoreSelectionState();
        });
      }
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      // Focus editor first to prevent flicker
      if (editorRef.current) {
        editorRef.current.focus();
      }
      
      // Save selection before changing content
      saveSelectionState();
      
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      
      if (editorRef.current && history[newIndex]) {
        const historyItem = history[newIndex];
        
        // Apply content without adding to history
        editorRef.current.innerHTML = historyItem.content;
        setHtml(historyItem.content);
        
        if (onValueChange) {
          onValueChange(historyItem.content);
        }
        
        // Use requestAnimationFrame for better timing with DOM updates
        window.requestAnimationFrame(() => {
          restoreSelectionState();
        });
      }
    }
  };

  const executeCommand = (command: string, value?: string, addToHistoryAfter: boolean = true) => {
    // Focus the editor before executing a command
    if (editorRef.current) {
      editorRef.current.focus();
    }
    
    // Using any to bypass TypeScript's type checking for execCommand
    document.execCommand(command, false, value as any);
    
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      setHtml(content);
      if (onValueChange) {
        onValueChange(content);
      }
      // Add to history with batching
      if (addToHistoryAfter) {
        addToHistory(content);
      }
      // Check formatting after command execution
      checkFormatting();
    }
  };

  const handleEditorChange = () => {
    if (editorRef.current) {
      // Save the current selection before content changes
      saveSelectionState();
      
      const content = editorRef.current.innerHTML;
      setHtml(content);
      if (onValueChange) {
        onValueChange(content);
      }
      // Add to history with batching
      addToHistory(content);
      // Check formatting when editor content changes
      checkFormatting();
    }
  };

  // Add mouse and selection events to detect formatting
  const handleSelectionChange = () => {
    checkFormatting();
  };

  const toggleBold = () => {
    // Don't apply bold if we're in a heading
    if (isSelectionInHeading()) {
      return;
    }
    
    executeCommand('bold');
    // Force an immediate state update after a short delay
    setTimeout(checkFormatting, 10);
  };
  
  const toggleItalic = () => {
    executeCommand('italic');
    // Force an immediate state update after a short delay
    setTimeout(checkFormatting, 10);
  };
  
  const toggleUnderline = () => {
    executeCommand('underline');
    // Force an immediate state update after a short delay
    setTimeout(checkFormatting, 10);
  };
  
  const toggleStrikethrough = () => {
    executeCommand('strikeThrough');
    // Force an immediate state update after a short delay
    setTimeout(checkFormatting, 10);
  };

  const applyHeading = (level: number) => {
    executeCommand('formatBlock', `h${level}`);
    setTimeout(checkFormatting, 10);
  };

  const applyParagraph = () => {
    executeCommand('formatBlock', 'p');
    setTimeout(checkFormatting, 10);
  };
  
  const insertImage = (url: string) => {
    // Focus editor before operation
    if (editorRef.current) {
      editorRef.current.focus();
      
      // Insert the image with proper sizing attributes
      const img = `<img src="${url}" alt="Inserted image" style="max-width:100%;height:auto;" />`;
      
      // Insert the image at the current selection
      document.execCommand('insertHTML', false, img);
      
      // Add a line break after the image to enable cursor positioning
      document.execCommand('insertHTML', false, '<br>');
      
      // Update content
      const content = editorRef.current.innerHTML;
      setHtml(content);
      addToHistory(content);
      if (onValueChange) {
        onValueChange(content);
      }
    }
  };

  const handleImageUpload = () => {
    const url = prompt('Enter image URL:');
    if (url) {
      insertImage(url);
    }
  };

  const exportToHTML = () => {
    if (!html) return '';
    const textArea = document.createElement('textarea');
    textArea.value = html;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    
    // Show checkmark
    setHtmlCopied(true);
    
    // Reset after 2 seconds
    setTimeout(() => {
      setHtmlCopied(false);
    }, 2000);
  };

  const exportToMarkdown = () => {
    if (!html) return '';
    
    // Create a temporary element to handle the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Process block elements first
    const processNode = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || '';
      }
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        let content = '';
        
        // Process child nodes first
        for (let i = 0; i < el.childNodes.length; i++) {
          content += processNode(el.childNodes[i]);
        }
        
        // Apply formatting based on tag
        switch (el.tagName.toLowerCase()) {
          case 'strong':
          case 'b':
            return `**${content}**`;
          case 'em':
          case 'i':
            return `*${content}*`;
          case 'u':
            return `_${content}_`;
          case 'strike':
          case 's':
            return `~~${content}~~`;
          case 'h1':
            return `# ${content}\n\n`;
          case 'h2':
            return `## ${content}\n\n`;
          case 'h3':
            return `### ${content}\n\n`;
          case 'h4':
            return `#### ${content}\n\n`;
          case 'h5':
            return `##### ${content}\n\n`;
          case 'h6':
            return `###### ${content}\n\n`;
          case 'li':
            try {
              // Check if parent is OL or UL
              const parentElement = el.parentElement;
              if (!parentElement) {
                return `- ${content}\n`; // Fallback if no parent
              }
              
              if (parentElement.tagName.toLowerCase() === 'ol') {
                // Use parent's start attribute if available
                const start = parentElement.getAttribute('start');
                const index = Array.from(parentElement.children).indexOf(el) + (start ? parseInt(start) : 1);
                // Get the indentation level by counting parent lists
                let level = 0;
                let currentParent = parentElement;
                while (currentParent) {
                  if (currentParent.tagName.toLowerCase() === 'ul' || currentParent.tagName.toLowerCase() === 'ol') {
                    level++;
                  }
                  const nextParent = currentParent.parentElement;
                  if (!nextParent) break;
                  currentParent = nextParent;
                }
                // Add proper indentation
                const indent = '  '.repeat(Math.max(0, level - 1));
                return `${indent}${index}. ${content}\n`;
              } else {
                // Get the indentation level by counting parent lists
                let level = 0;
                let currentParent = parentElement;
                while (currentParent) {
                  if (currentParent.tagName.toLowerCase() === 'ul' || currentParent.tagName.toLowerCase() === 'ol') {
                    level++;
                  }
                  const nextParent = currentParent.parentElement;
                  if (!nextParent) break;
                  currentParent = nextParent;
                }
                // Add proper indentation and bullet type based on level
                const indent = '  '.repeat(Math.max(0, level - 1));
                const bullet = level % 2 === 1 ? '-' : '*';
                return `${indent}${bullet} ${content}\n`;
              }
            } catch (e) {
              // Fallback for any errors
              return `- ${content}\n`;
            }
          case 'ul':
          case 'ol':
            return content;
          case 'p':
            return `${content}\n\n`;
          case 'div':
            return `${content}\n`;
          case 'br':
            return '\n';
          case 'img':
            const src = el.getAttribute('src') || '';
            const alt = el.getAttribute('alt') || '';
            return `![${alt}](${src})`;
          default:
            return content;
        }
      }
      
      return '';
    };
    
    let markdown = processNode(tempDiv);
    
    // Clean up extra whitespace
    markdown = markdown
      .replace(/\n{3,}/g, '\n\n')  // No more than 2 consecutive newlines
      .replace(/&nbsp;/g, ' ')
      .trim();
    
    // Copy to clipboard
    const textArea = document.createElement('textarea');
    textArea.value = markdown;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    
    // Show checkmark
    setMarkdownCopied(true);
    
    // Reset after 2 seconds
    setTimeout(() => {
      setMarkdownCopied(false);
    }, 2000);
  };

  // Initialize formatting state when component mounts
  useEffect(() => {
    // Check initial formatting after a short delay to ensure editor is ready
    setTimeout(checkFormatting, 100);
  }, []);

  // Add these functions after the alignText function and before insertImage
  
  const createOrderedList = () => {
    executeCommand('insertOrderedList');
    setTimeout(() => {
      checkFormatting();
      setIsOrderedList(document.queryCommandState('insertOrderedList'));
    }, 10);
  };

  const createUnorderedList = () => {
    executeCommand('insertUnorderedList');
    setTimeout(() => {
      checkFormatting();
      setIsUnorderedList(document.queryCommandState('insertUnorderedList'));
    }, 10);
  };

  return (
    <div className="editor-container">
      <div className="editor-toolbar">
        {/* History buttons */}
        <button
          type="button"
          onClick={undo}
          className={`toolbar-button ${isUndoDisabled ? 'disabled' : ''}`}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
          disabled={isUndoDisabled}
        >
          <UndoIcon className="icon-current" />
        </button>

        <button
          type="button"
          onClick={redo}
          className={`toolbar-button ${isRedoDisabled ? 'disabled' : ''}`}
          title="Redo (Ctrl+Y)"
          aria-label="Redo"
          disabled={isRedoDisabled}
        >
          <RedoIcon className="icon-current" />
        </button>

        <div className="toolbar-divider"></div>

        {/* Custom Heading Dropdown */}
        <CustomDropdown
          options={[
            { value: 'p', label: 'Paragraph' },
            { value: '1', label: 'Heading 1' },
            { value: '2', label: 'Heading 2' },
            { value: '3', label: 'Heading 3' },
            { value: '4', label: 'Heading 4' },
            { value: '5', label: 'Heading 5' },
            { value: '6', label: 'Heading 6' }
          ]}
          onChange={(value) => value === 'p' ? applyParagraph() : applyHeading(parseInt(value))}
          className="custom-toolbar-select"
          title="Text Style"
          ariaLabel="Text Style"
        />

        <div className="toolbar-divider"></div>

        {/* Formatting buttons */}
        <button
          type="button"
          onClick={toggleBold}
          className={`toolbar-button ${isBold ? 'active' : ''}`}
          title="Bold (Ctrl+B)"
          aria-label="Bold"
        >
          <BoldIcon className="icon-current" />
        </button>

        <button
          type="button"
          onClick={toggleItalic}
          className={`toolbar-button ${isItalic ? 'active' : ''}`}
          title="Italic (Ctrl+I)"
          aria-label="Italic"
        >
          <ItalicIcon className="icon-current" />
        </button>

        <button
          type="button"
          onClick={toggleUnderline}
          className={`toolbar-button ${isUnderline ? 'active' : ''}`}
          title="Underline (Ctrl+U)"
          aria-label="Underline"
        >
          <UnderlineIcon className="icon-current" />
        </button>

        <button
          type="button"
          onClick={toggleStrikethrough}
          className={`toolbar-button ${isStrike ? 'active' : ''}`}
          title="Strikethrough"
          aria-label="Strikethrough"
        >
          <StrikethroughIcon className="icon-current" />
        </button>

        <div className="toolbar-divider"></div>

        {/* List buttons */}
        <button
          type="button"
          onClick={createOrderedList}
          className={`toolbar-button ${isOrderedList ? 'active' : ''}`}
          title="Ordered List"
          aria-label="Ordered List"
        >
          <OrderedListIcon className="icon-current" />
        </button>

        <button
          type="button"
          onClick={createUnorderedList}
          className={`toolbar-button ${isUnorderedList ? 'active' : ''}`}
          title="Bullet List"
          aria-label="Bullet List"
        >
          <UnorderedListIcon className="icon-current" />
        </button>

        <div className="editor-spacer"></div>

        <button
          type="button"
          onClick={exportToHTML}
          className="export-button"
          title="Copy HTML"
          aria-label="Copy HTML"
        >
          <span>HTML</span>
          {htmlCopied ? (
            <CheckIcon className="icon-current success" />
          ) : (
            <CopyIcon className="icon-current" />
          )}
        </button>
        
        <button
          type="button"
          onClick={exportToMarkdown}
          className="export-button"
          title="Copy Markdown"
          aria-label="Copy Markdown"
        >
          <span>MD</span>
          {markdownCopied ? (
            <CheckIcon className="icon-current success" />
          ) : (
            <CopyIcon className="icon-current" />
          )}
        </button>
      </div>
      
      <div
        ref={editorRef}
        className="editor-content"
        contentEditable
        onInput={handleEditorChange}
        onBlur={handleEditorChange}
        onKeyUp={checkFormatting}
        onMouseUp={handleSelectionChange}
        onFocus={checkFormatting}
        data-placeholder={placeholder}
      />
    </div>
  );
};

export default TextEditor; 