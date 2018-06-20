import { utils } from 'web3'

export const PERMIT_FORMS = ['DIGITAL', 'PAPER']

export const PERMIT_TYPES = ['EXPORT', 'RE-EXPORT', 'OTHER']

export const DEFAULT_SPECIMEN = {
  quantity: 0,
  scientificName: '',
  commonName: '',
  description: '',
  originHash: '',
  reExportHash: ''
}

export const DEFAULT_PERMIT = {
  exportCountry: '',
  importCountry: '',
  permitType: PERMIT_TYPES[0],
  importer: ['', '', ''],
  exporter: ['', '', '']
}

export const PERMITS_TABLE_HEADER_LABELS = [
  'permitHash',
  'exportCountry',
  'importCountry',
  'timestamp',
  'status'
]

export function convertSpecimensToArrays(specimens) {
  return specimens.reduce(
    (result, specimen) => {
      result.quantities.push(specimen.quantity)
      result.scientificNames.push(specimen.scientificName)
      result.commonNames.push(specimen.commonName)
      result.descriptions.push(specimen.description)
      result.originHashes.push(specimen.originHash)
      result.reExportHashes.push(specimen.reExportHash)
      return result
    },
    {
      quantities: [],
      scientificNames: [],
      commonNames: [],
      descriptions: [],
      originHashes: [],
      reExportHashes: []
    }
  )
}

export function parseRawPermit(rawPermit) {
  return {
    exportCountry: utils.hexToUtf8(rawPermit[0]),
    importCountry: utils.hexToUtf8(rawPermit[1]),
    permitType: PERMIT_TYPES[rawPermit[2]],
    exporter: {
      name: utils.hexToUtf8(rawPermit[3][0]),
      street: utils.hexToUtf8(rawPermit[3][1]),
      city: utils.hexToUtf8(rawPermit[3][2])
    },
    importer: {
      name: utils.hexToUtf8(rawPermit[4][0]),
      street: utils.hexToUtf8(rawPermit[4][1]),
      city: utils.hexToUtf8(rawPermit[4][2])
    },
    specimenHashes: rawPermit[5],
    nonce: rawPermit[6]
  }
}

export function parseRawSpecimen(rawSpecimen) {
  return {
    permitHash: rawSpecimen[0],
    quantity: rawSpecimen[1],
    scientificName: utils.hexToUtf8(rawSpecimen[2]),
    commonName: utils.hexToUtf8(rawSpecimen[3]),
    description: utils.hexToUtf8(rawSpecimen[4]),
    originHash: rawSpecimen[5],
    reExportHash: rawSpecimen[6]
  }
}

/**
 * Fetches event logs from the PermitFactory contract.
 * @param {object} permitFactory A web3 instance of the PermitFactory contract.
 * @param {string} eventName Name of the event log -> `PermitCreated` or `PermitConfirmed`.
 * @param {number} fromBlock Start of block range for query.
 * @returns An array of formatted PermitFactory event logs.
 */
export async function getPermitEvents(permitFactory, eventName, fromBlock = 0) {
  const events = await permitFactory.getPastEvents(eventName, { fromBlock })
  return events.map(e => _formatEvent(e))
}

/**
 * Formats an event log of the PermitFactory contract. Only for internal use.
 * @param {object} permitEvent Unformatted PermitFactory event log.
 * @returns Formatted event log.
 */
function _formatEvent(permitEvent) {
  const { blockNumber, event, returnValues } = permitEvent
  const { permitHash, exportCountry, importCountry } = returnValues
  return {
    event,
    blockNumber,
    permitHash,
    exportCountry: utils.hexToUtf8(exportCountry),
    importCountry: utils.hexToUtf8(importCountry),
    status: event === 'PermitCreated' ? 'created' : 'processed'
  }
}

/**
 * Formats the block number of events to the corresponding UNIX timestamps.
 * @param {object} web3 A web3 instance.
 * @param {Array} events Array of events with blocknumber attribute.
 * @returns {Promise<number[]>} Array of events with UNIX timestamps in ms.
 */
export async function blockNumberToUnix(web3, events) {
  const blocks = await Promise.all(
    events.map(e => web3.eth.getBlock(e.blockNumber, false))
  )
  return events.map((e, i) => ({
    ...e,
    // convert seconds into miliseconds
    timestamp: blocks[i].timestamp * 1000
  }))
}

/**
 * Merges two event arrays. Overwrites an event if a second event with status `processed` is given.
 * @param {Array} oldEvents Array of current event logs.
 * @param {Array} newEvents Array of new event lgos.
 * @returns Array of merged events where only one event exists per permit hash.
 */
export function mergePermitEvents(oldEvents, newEvents) {
  const mergedEvents = newEvents.concat(oldEvents)
  return mergedEvents.reduce((result, current) => {
    const index = result.findIndex(
      elem => elem.permitHash === current.permitHash
    )
    if (index === -1) {
      result.push(current)
    } else if (current.status === 'processed') {
      result.splice(index, 1)
      result.push(current)
    }
    return result
  }, [])
}

export function sortPermitEvents(events, attribute, ascending) {
  return events.sort((a, b) => {
    if (attribute === 'permitHash' || attribute === 'timestamp') {
      return ascending
        ? a[attribute] - b[attribute]
        : b[attribute] - a[attribute]
    } else {
      if (a[attribute] < b[attribute]) {
        return ascending ? -1 : 1
      }
      if (a[attribute] > b[attribute]) {
        return ascending ? 1 : -1
      }
      return 0
    }
  })
}
