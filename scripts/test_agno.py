#!/usr/bin/env python3
"""
Test script to verify Agno installation and dependencies
"""

import sys
import os

def test_imports():
    """Test importing required modules"""
    print(f"Python version: {sys.version}")
    print(f"Python executable: {sys.executable}")
    print(f"Current working directory: {os.getcwd()}")
    print(f"PYTHONPATH: {os.environ.get('PYTHONPATH', 'Not set')}")
    
    # Test OpenAI import
    try:
        import openai
        print(f"✅ openai module imported successfully (version: {openai.__version__})")
    except ImportError as e:
        print(f"❌ Failed to import openai: {e}")
    
    # Test Agno imports
    try:
        from agno.agent import Agent
        print("✅ agno.agent module imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import agno.agent: {e}")
        
    try:
        from agno.models.azure.openai_chat import AzureOpenAI
        print("✅ agno.models.azure.openai_chat module imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import agno.models.azure.openai_chat: {e}")
    
    # Test environment variables
    print("\nChecking environment variables:")
    for env_var in ["AZURE_OPENAI_API_KEY", "AZURE_OPENAI_API_VERSION", "AZURE_OPENAI_ENDPOINT"]:
        value = os.environ.get(env_var)
        if value:
            masked = value[:4] + "..." + value[-4:] if len(value) > 8 else "[set]"
            print(f"✅ {env_var}: {masked}")
        else:
            print(f"❌ {env_var} not set")

if __name__ == "__main__":
    test_imports()
    print("\nTest complete.")