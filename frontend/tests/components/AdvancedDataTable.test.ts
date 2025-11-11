import { describe, test, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AdvancedDataTable from '@/components/data/AdvancedDataTable.vue'
import type { TableColumn, TableRow } from '@/components/data/AdvancedDataTable.vue'

describe('AdvancedDataTable Component', () => {
  const sampleColumns: TableColumn[] = [
    { key: 'id', label: 'ID', sortable: true, filterable: true },
    { key: 'name', label: 'Name', sortable: true, filterable: true },
    { key: 'value', label: 'Value', sortable: true, align: 'right' },
    { key: 'status', label: 'Status', filterable: true }
  ]

  const sampleData: TableRow[] = [
    { id: 1, name: 'Item 1', value: 100, status: 'Active' },
    { id: 2, name: 'Item 2', value: 200, status: 'Inactive' },
    { id: 3, name: 'Item 3', value: 150, status: 'Active' },
    { id: 4, name: 'Item 4', value: 300, status: 'Pending' }
  ]

  let wrapper: any

  beforeEach(() => {
    wrapper = mount(AdvancedDataTable, {
      props: {
        columns: sampleColumns,
        data: sampleData
      }
    })
  })

  test('renders table with correct structure', () => {
    expect(wrapper.find('.advanced-data-table').exists()).toBe(true)
    expect(wrapper.find('table.data-table').exists()).toBe(true)
    expect(wrapper.findAll('thead th')).toHaveLength(sampleColumns.length)
    expect(wrapper.findAll('tbody tr')).toHaveLength(sampleData.length)
  })

  test('displays correct column headers', () => {
    const headers = wrapper.findAll('thead th')
    sampleColumns.forEach((column, index) => {
      expect(headers[index].text()).toContain(column.label)
    })
  })

  test('sorts data when column header is clicked', async () => {
    const nameHeader = wrapper.findAll('thead th')[1] // Name column
    await nameHeader.trigger('click')

    expect(wrapper.emitted('sort-change')).toBeTruthy()
    expect(wrapper.emitted('sort-change')[0]).toEqual([
      { key: 'name', direction: 'asc' }
    ])

    // Click again for descending
    await nameHeader.trigger('click')
    expect(wrapper.emitted('sort-change')[1]).toEqual([
      { key: 'name', direction: 'desc' }
    ])
  })

  test('filters data when search query is entered', async () => {
    const searchInput = wrapper.find('.search-input')
    await searchInput.setValue('Item 1')

    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
    expect(wrapper.find('tbody tr').text()).toContain('Item 1')
  })

  test('applies column filters correctly', async () => {
    const statusFilter = wrapper.findAll('.filter-input')[3] // Status column filter
    await statusFilter.setValue('Active')

    expect(wrapper.emitted('filter-change')).toBeTruthy()
    expect(wrapper.findAll('tbody tr')).toHaveLength(2) // Two items with status 'Active'
  })

  test('handles pagination correctly', async () => {
    const wrapperWithPagination = mount(AdvancedDataTable, {
      props: {
        columns: sampleColumns,
        data: Array.from({ length: 50 }, (_, i) => ({
          id: i + 1,
          name: `Item ${i + 1}`,
          value: (i + 1) * 10,
          status: i % 2 === 0 ? 'Active' : 'Inactive'
        })),
        itemsPerPage: 10,
        pagination: true
      }
    })

    expect(wrapperWithPagination.findAll('tbody tr')).toHaveLength(10)
    expect(wrapperWithPagination.find('.pagination-info').text()).toContain('1 to 10 of 50')

    // Test page navigation
    const nextButton = wrapperWithPagination.find('.pagination-btn:last-of-type')
    await nextButton.trigger('click')

    expect(wrapperWithPagination.find('.pagination-info').text()).toContain('11 to 20 of 50')
  })

  test('handles row selection when selectable', async () => {
    const selectableWrapper = mount(AdvancedDataTable, {
      props: {
        columns: sampleColumns,
        data: sampleData,
        selectable: true
      }
    })

    const firstRowCheckbox = selectableWrapper.findAll('.select-cell input')[0]
    await firstRowCheckbox.trigger('click')

    expect(selectableWrapper.emitted('row-select')).toBeTruthy()
    expect(selectableWrapper.emitted('row-select')[0][0]).toHaveLength(1)
    expect(selectableWrapper.emitted('row-select')[0][0][0].id).toBe(1)
  })

  test('handles select all functionality', async () => {
    const selectableWrapper = mount(AdvancedDataTable, {
      props: {
        columns: sampleColumns,
        data: sampleData,
        selectable: true,
        pagination: false
      }
    })

    const selectAllCheckbox = selectableWrapper.find('.select-column input')
    await selectAllCheckbox.trigger('click')

    expect(selectableWrapper.emitted('row-select')).toBeTruthy()
    expect(selectableWrapper.emitted('row-select')[0][0]).toHaveLength(sampleData.length)
  })

  test('emits row-click event when row is clicked', async () => {
    const firstRow = wrapper.findAll('tbody tr')[0]
    await firstRow.trigger('click')

    expect(wrapper.emitted('row-click')).toBeTruthy()
    expect(wrapper.emitted('row-click')[0][0].id).toBe(1)
  })

  test('handles keyboard navigation', async () => {
    const firstRow = wrapper.findAll('tbody tr')[0]
    await firstRow.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('row-click')).toBeTruthy()
    expect(wrapper.emitted('row-click')[0][0].id).toBe(1)
  })

  test('displays loading state correctly', () => {
    const loadingWrapper = mount(AdvancedDataTable, {
      props: {
        columns: sampleColumns,
        data: [],
        loading: true
      }
    })

    expect(loadingWrapper.find('.loading-cell').exists()).toBe(true)
    expect(loadingWrapper.find('.loading-spinner').exists()).toBe(true)
  })

  test('displays empty state correctly', () => {
    const emptyWrapper = mount(AdvancedDataTable, {
      props: {
        columns: sampleColumns,
        data: [],
        loading: false,
        emptyMessage: 'No items found'
      }
    })

    expect(emptyWrapper.find('.empty-cell').exists()).toBe(true)
    expect(emptyWrapper.find('.empty-state').text()).toContain('No items found')
  })

  test('clears filters when clear button is clicked', async () => {
    const searchInput = wrapper.find('.search-input')
    await searchInput.setValue('test')

    expect(wrapper.find('.active-filters').exists()).toBe(true)

    const clearButton = wrapper.find('.clear-filters-btn')
    await clearButton.trigger('click')

    expect(wrapper.find('.active-filters').exists()).toBe(false)
    expect(wrapper.find('.search-input').element.value).toBe('')
  })

  test('handles column formatting correctly', () => {
    const formatWrapper = mount(AdvancedDataTable, {
      props: {
        columns: [
          {
            key: 'value',
            label: 'Value',
            format: (value: number) => `$${value.toFixed(2)}`
          }
        ],
        data: [{ id: 1, value: 123.456 }]
      }
    })

    expect(formatWrapper.find('.table-cell').text()).toBe('$123.46')
  })

  test('respects column alignment', () => {
    const alignmentWrapper = mount(AdvancedDataTable, {
      props: {
        columns: [
          { key: 'id', label: 'ID', align: 'center' },
          { key: 'value', label: 'Value', align: 'right' }
        ],
        data: [{ id: 1, value: 100 }]
      }
    })

    const cells = alignmentWrapper.findAll('.table-cell')
    expect(cells[0].attributes('style')).toContain('text-align: center')
    expect(cells[1].attributes('style')).toContain('text-align: right')
  })

  test('maintains accessibility standards', () => {
    // Test ARIA attributes
    expect(wrapper.find('table').attributes('role')).toBe('grid')
    expect(wrapper.find('table').attributes('aria-label')).toBe('Advanced data table')

    // Test column headers have proper roles
    const headers = wrapper.findAll('thead th')
    headers.forEach(header => {
      expect(header.attributes('role')).toBe('columnheader')
    })

    // Test rows have proper roles
    const rows = wrapper.findAll('tbody tr')
    rows.forEach(row => {
      expect(row.attributes('role')).toBe('row')
      expect(row.attributes('tabindex')).toBe('0')
    })

    // Test cells have proper roles
    const cells = wrapper.findAll('.table-cell')
    cells.forEach(cell => {
      expect(cell.attributes('role')).toBe('gridcell')
    })
  })

  test('handles large datasets efficiently', () => {
    const largeData = Array.from({ length: 1000 }, (_, i) => ({
      id: i + 1,
      name: `Item ${i + 1}`,
      value: Math.random() * 1000,
      status: i % 2 === 0 ? 'Active' : 'Inactive'
    }))

    const startTime = performance.now()

    const largeWrapper = mount(AdvancedDataTable, {
      props: {
        columns: sampleColumns,
        data: largeData,
        itemsPerPage: 25
      }
    })

    const renderTime = performance.now() - startTime

    // Should render large dataset in under 500ms
    expect(renderTime).toBeLessThan(500)
    expect(largeWrapper.findAll('tbody tr')).toHaveLength(25) // Paginated
  })
})