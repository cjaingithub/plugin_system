"""
Flowchart Adapters Module

Contains adapters for parsing different flowchart formats into the
common TaskGraph intermediate representation.
"""

from .lucidchart import LucidchartAdapter

__all__ = ["LucidchartAdapter"]
