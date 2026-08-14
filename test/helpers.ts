import { DatabaseSync } from 'node:sqlite'
import { createRepo, type Repo } from '../server/db'

export function testRepo(): Repo {
  const db = new DatabaseSync(':memory:')
  return createRepo(db)
}

export function makePerson(repo: Repo, name = 'Test Person', extra: Record<string, unknown> = {}) {
  return repo.createPerson({ name, email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`, tags: [], ...extra })
}
