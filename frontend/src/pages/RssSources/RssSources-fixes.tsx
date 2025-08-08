import React from 'react';

// Fix for RssSources.tsx title issue
// This file contains the key fixes needed for the title functionality

// 1. Fix the RssSourceCard title display logic
const titleDisplay = (source: any): string => {
  // Priority: custom title > feed title > fallback
  return source.title || source.name || source.feed_title || 'Untitled RSS Source';
};

// 2. Improved validateUrl function with better title handling
const validateUrl = async (
  urlToValidate: string, 
  currentTitle: string,
  setValidationResult: (result: any) => void,
  setTitle: (title: string) => void,
  rssApi: any
): Promise<void> => {
  if (!urlToValidate.trim()) {
    setValidationResult(null);
    return;
  }

  try {
    const response = await rssApi.validateSource(urlToValidate);
    setValidationResult(response.data);
    
    // Only auto-fill title if:
    // 1. Validation is successful
    // 2. Feed has a title
    // 3. User hasn't entered a custom title yet
    if (response.data.valid && 
        response.data.feed_info?.title && 
        !currentTitle.trim()) {
      setTitle(response.data.feed_info.title);
    }
  } catch (err: any) {
    setValidationResult(null);
  }
};

// 3. Handle title changes to prevent auto-override
const handleTitleChange = (
  e: React.ChangeEvent<HTMLInputElement>,
  setTitle: (title: string) => void,
  setUserHasEnteredTitle: (hasEntered: boolean) => void
): void => {
  const newTitle = e.target.value;
  setTitle(newTitle);
  // Mark that user has manually entered a title
  setUserHasEnteredTitle(!!newTitle.trim());
};

// 4. Enhanced handleAdd function to use the custom title
const handleAdd = async (
  url: string,
  title: string,
  validationResult: any,
  setIsAdding: (isAdding: boolean) => void,
  rssApi: any,
  queryClient: any,
  onClose: () => void,
  setUrl: (url: string) => void,
  setTitle: (title: string) => void,
  setValidationResult: (result: any) => void
): Promise<void> => {
  if (!url.trim()) return;
  
  if (!validationResult?.valid) {
    return;
  }
  
  setIsAdding(true);
  try {
    // Use the custom title if provided, otherwise use auto-detected title
    const finalTitle = title.trim() || 
                      (validationResult.feed_info?.title) || 
                      undefined;
    
    await rssApi.createSource(url, finalTitle);
    queryClient.invalidateQueries({ queryKey: ['rssSources'] });
    onClose();
    setUrl('');
    setTitle('');
    setValidationResult(null);
  } catch (err: any) {
    // Handle error
    console.error('Failed to add RSS source:', err);
  } finally {
    setIsAdding(false);
  }
};

export { titleDisplay, validateUrl, handleTitleChange, handleAdd };