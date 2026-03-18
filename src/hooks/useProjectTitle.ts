import { useEffect } from 'react'

export function useProjectTitle() {
  useEffect(() => {
    document.title = '漂流者：信任臨界'
  }, [])
}
