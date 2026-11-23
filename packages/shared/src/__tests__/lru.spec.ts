import { describe, expect, it } from 'vitest'

import { LRUMap } from '../lru'

describe('LRUMap', () => {
  it('超过容量时淘汰最久未使用的项', () => {
    const cache = new LRUMap<string, number>(2)

    cache.set('a', 1).set('b', 2)
    expect(cache.get('a')).toBe(1)
    cache.set('c', 3)

    expect(cache.size).toBe(2)
    expect(cache.has('b')).toBe(false)
    expect(cache.get('a')).toBe(1)
    expect(cache.get('c')).toBe(3)
  })

  it('set 已存在的 key 只更新值', () => {
    const cache = new LRUMap<string, number>(2)

    cache.set('a', 1)
    cache.set('a', 2)

    expect(cache.size).toBe(1)
    expect(cache.get('a')).toBe(2)
  })

  it('delete / clear / toJSON 正常工作', () => {
    const cache = new LRUMap<string, number>(3)

    cache.set('a', 1).set('b', 2)
    expect(cache.delete('a')).toBe(1)
    expect(cache.size).toBe(1)
    expect(cache.toJSON()).toEqual([{ key: 'b', value: 2 }])

    cache.clear()
    expect(cache.size).toBe(0)
    expect(cache.toJSON()).toEqual([])
  })

  it('支持通过 entries 初始化并自动推断容量', () => {
    const cache = new LRUMap<string, number>([
      ['a', 1],
      ['b', 2],
    ] as any)

    expect(cache.limit).toBe(2)
    expect(cache.get('b')).toBe(2)
  })

  it('keys / values / forEach 按从旧到新遍历', () => {
    const cache = new LRUMap<string, number>(3)

    cache.set('a', 1).set('b', 2)
    expect([...cache.keys()]).toEqual(['a', 'b'])
    expect([...cache.values()]).toEqual([1, 2])

    const visited: string[] = []
    cache.forEach((value, key) => {
      visited.push(`${key}:${value}`)
    }, cache)
    expect(visited).toEqual(['a:1', 'b:2'])
  })

  it('find 只读取不更新使用顺序', () => {
    const cache = new LRUMap<string, number>(2)

    cache.set('a', 1).set('b', 2)
    expect(cache.find('a')).toBe(1)
    expect(cache.find('missing')).toBeUndefined()
    cache.set('c', 3)

    expect(cache.has('a')).toBe(false)
    expect(cache.has('b')).toBe(true)
  })

  it('访问中间与最新项时正确调整链表', () => {
    const cache = new LRUMap<string, number>(3)

    cache.set('a', 1).set('b', 2).set('c', 3)
    expect(cache.get('b')).toBe(2)
    expect(cache.get('c')).toBe(3)
    cache.set('d', 4)

    expect(cache.has('a')).toBe(false)
    expect([...cache.keys()]).toEqual(['b', 'c', 'd'])
  })

  it('delete 支持中间、最旧、最新与不存在的 key', () => {
    const cache = new LRUMap<string, number>(3)

    cache.set('a', 1).set('b', 2).set('c', 3)
    expect(cache.delete('b')).toBe(2)
    expect(cache.size).toBe(2)
    expect(cache.delete('a')).toBe(1)
    expect(cache.delete('c')).toBe(3)
    expect(cache.size).toBe(0)
    expect(cache.delete('missing')).toBeUndefined()
    expect(cache.oldest).toBeUndefined()
    expect(cache.newest).toBeUndefined()
  })

  it('toString 与迭代器按从旧到新输出', () => {
    const cache = new LRUMap<string, number>(2)

    cache.set('a', 1).set('b', 2)
    expect(cache.toString()).toBe('a:1 < b:2')
    expect([...cache]).toEqual([
      ['a', 1],
      ['b', 2],
    ])
  })

  it('forEach 传入非对象上下文时回退到缓存实例', () => {
    const cache = new LRUMap<string, number>(2)

    cache.set('a', 1)
    const contexts: any[] = []
    cache.forEach(function (this: any) {
      contexts.push(this)
    }, 'invalid')

    expect(contexts).toEqual([cache])
  })

  it('assign 超过容量时抛出 overflow', () => {
    const cache = new LRUMap<string, number>(2)

    expect(() =>
      cache.assign([
        ['a', 1],
        ['b', 2],
        ['c', 3],
      ])
    ).toThrow('overflow')
  })

  it('容量为 1 与 0 时正确淘汰', () => {
    const single = new LRUMap<string, number>(1)
    single.set('a', 1).set('b', 2)
    expect([...single.keys()]).toEqual(['b'])

    const empty = new LRUMap<string, number>(0)
    empty.set('a', 1)
    expect(empty.size).toBe(0)
    expect(empty.shift()).toBeUndefined()
  })
})
