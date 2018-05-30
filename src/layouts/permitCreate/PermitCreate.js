import React, { Component } from 'react'
import PropTypes from 'prop-types'
import {
  Button,
  Box,
  Columns,
  Heading,
  Select,
  FormField,
  AddIcon,
  DocumentUploadIcon,
  Toast
} from 'grommet'
import { utils } from 'web3'

import AddressInputs from '../../components/AddressInputs'
import SpeciesInputs from '../../components/SpeciesInputs'
import * as options from '../../util/options'
import * as permitUtils from '../../util/permitUtils'

class PermitCreate extends Component {
  constructor(props, context) {
    super(props)
    this.state = {
      permitForm: permitUtils.PERMIT_FORMS[0],
      permit: {
        exportCountry: '',
        importCountry: '',
        permitType: permitUtils.PERMIT_TYPES[0],
        importer: ['', '', ''],
        exporter: ['', '', '']
      },
      specimens: [permitUtils.DEFAULT_SPECIMEN],
      // authority information
      authorityCountry: '',
      // tx information toast
      toast: {
        show: false,
        status: '',
        text: ''
      },
      // tx status
      txStatus: ''
    }
    // for convinience
    this.contracts = context.drizzle.contracts
    this.setAuthToCountryKey()
  }

  componentDidMount() {
    this.handleFormChange(this.state.permitForm)
  }

  componentDidUpdate(prevProps, prevState) {
    // check if accounts changed
    if (this.props.accounts[0] !== prevProps.accounts[0]) {
      this.setAuthToCountryKey()
      this.handleFormChange(this.state.permitForm)
    }
    // check if key is cached
    if (this.authToCountryKey in this.props.PermitFactory.authorityToCountry) {
      const authorityCountry = utils.hexToUtf8(
        this.props.PermitFactory.authorityToCountry[this.authToCountryKey].value
      )
      // only set state if authority country changed
      if (prevState.authorityCountry !== authorityCountry) {
        this.setState({ authorityCountry })
        this.handleFormChange(this.state.permitForm)
      }
    }
    // check if tx for stack id exists
    if (this.props.transactionStack[this.stackId]) {
      const txHash = this.props.transactionStack[this.stackId]
      const { status } = this.props.transactions[txHash]
      // change tx related state is status changed
      if (prevState.txStatus !== status) {
        this.changeTxState(status)
      }
    }
  }

  /**
   * UI ONLY HANDLERS
   */

  handleFormChange(permitForm) {
    const { permit, authorityCountry } = this.state
    if (permitForm === 'DIGITAL') {
      permit.exportCountry = authorityCountry
      permit.importCountry = ''
    } else {
      permit.importCountry = authorityCountry
      permit.exportCountry = ''
    }
    this.setState({ permitForm, permit })
  }

  handlePermitChange(attribute, newValue) {
    const { permit } = this.state
    permit[attribute] = newValue
    this.setState({ permit })
  }

  handleAddressChange(index, recipient, newValue) {
    const newAddress = this.state.permit[recipient]
    newAddress[index] = newValue
    this.handlePermitChange(recipient, newAddress)
  }

  handleSpeciesChange(index, attribute, newValue) {
    const { specimens } = this.state
    const newSpecies = { ...specimens[index] }
    newSpecies[attribute] = newValue
    specimens[index] = newSpecies
    this.setState({ specimens })
  }

  addSpecies() {
    const { specimens } = this.state
    specimens.push(permitUtils.DEFAULT_SPECIMEN)
    this.setState({ specimens })
  }

  removeSpecies(index) {
    const { specimens } = this.state
    specimens.splice(index, 1)
    this.setState({ specimens })
  }

  /**
   * DRIZZLE HANDLERS
   */

  setAuthToCountryKey() {
    // return key for data and cache result in PermitFatory prop
    this.authToCountryKey = this.contracts.PermitFactory.methods.authorityToCountry.cacheCall(
      this.props.accounts[0]
    )
  }

  createPermit() {
    const { permit, specimens } = this.state
    const specimensAsArrays = permitUtils.convertSpecimensToArrays(specimens)
    this.stackId = this.contracts.PermitFactory.methods.createPermit.cacheSend(
      utils.asciiToHex(permit.exportCountry),
      utils.asciiToHex(permit.importCountry),
      permitUtils.PERMIT_TYPES.indexOf(permit.permitType),
      permit.importer.map(address => utils.asciiToHex(address)),
      permit.exporter.map(address => utils.asciiToHex(address)),
      specimensAsArrays.quantities,
      specimensAsArrays.scientificNames.map(e => utils.asciiToHex(e)),
      specimensAsArrays.commonNames.map(e => utils.asciiToHex(e)),
      specimensAsArrays.descriptions.map(e => utils.asciiToHex(e)),
      specimensAsArrays.originHashes.map(e => utils.asciiToHex(e)),
      specimensAsArrays.reExportHashes.map(e => utils.asciiToHex(e)),
      { from: this.props.accounts[0] }
    )
  }

  changeTxState(newTxState) {
    if (newTxState === 'pending') {
      this.setState({
        txStatus: 'pending',
        toast: {
          show: true,
          status: 'unknown',
          text: 'Permit creation is pending...'
        }
      })
    } else if (newTxState === 'success') {
      this.stackId = ''
      this.setState({
        txStatus: 'success',
        toast: {
          show: true,
          status: 'ok',
          text: 'Permit creation was successful!'
        }
      })
    } else {
      this.stackId = ''
      this.setState({
        txStatus: 'failed',
        toast: {
          show: true,
          status: 'critical',
          text: 'Permit creation failed.'
        }
      })
    }
  }

  render() {
    const { permitForm, permit, specimens } = this.state
    return (
      <Box>
        {this.state.toast.show && (
          <Toast
            status={this.state.toast.status}
            onClose={() =>
              this.setState({
                txStatus: '',
                toast: { show: false }
              })
            }>
            {this.state.toast.text}
          </Toast>
        )}
        <Heading align={'center'} margin={'medium'}>
          CITES Permit
        </Heading>
        <Columns justify={'between'} size={'large'}>
          <FormField label={'Type'}>
            <Select
              value={permitForm}
              options={permitUtils.PERMIT_FORMS}
              onChange={({ option }) => {
                this.handleFormChange(option)
              }}
            />
          </FormField>
          <FormField label={'Permit type'}>
            <Select
              value={permit.permitType}
              options={permitUtils.PERMIT_TYPES}
              onChange={({ option }) => {
                this.handlePermitChange('permitType', option)
              }}
            />
          </FormField>
        </Columns>
        <Columns justify={'between'} size={'large'}>
          <FormField label={'Country of export'}>
            <Select
              value={permit.exportCountry}
              options={options.countries}
              onChange={({ option }) => {
                this.handlePermitChange('exportCountry', option.value)
              }}
            />
          </FormField>
          <FormField label={'Country of import'}>
            <Select
              value={permit.importCountry}
              options={options.countries}
              onChange={({ option }) => {
                this.handlePermitChange('importCountry', option.value)
              }}
            />
          </FormField>
        </Columns>
        <Columns justify={'between'} size={'large'}>
          <AddressInputs
            address={permit.exporter}
            recipient={'exporter'}
            onChange={(recipient, index, newValue) => {
              this.handleAddressChange(index, recipient, newValue)
            }}
          />
          <AddressInputs
            address={permit.importer}
            recipient={'importer'}
            onChange={(recipient, index, newValue) => {
              this.handleAddressChange(index, recipient, newValue)
            }}
          />
        </Columns>
        <Box
          justify={'between'}
          size={'full'}
          direction={'row'}
          margin={'medium'}>
          <Heading tag={'h3'}>Specimens</Heading>
          <Button
            label={'Add Species'}
            icon={<AddIcon />}
            onClick={() => this.addSpecies()}
          />
        </Box>
        {specimens.map((species, index) => (
          <SpeciesInputs
            key={index}
            index={index}
            species={species}
            onChange={(attr, newValue) => {
              this.handleSpeciesChange(index, attr, newValue)
            }}
            onRemove={index => {
              this.removeSpecies(index)
            }}
          />
        ))}
        <Box
          justify={'center'}
          size={'full'}
          direction={'row'}
          margin={'medium'}>
          <Button
            primary={true}
            label={'Create Permit'}
            icon={<DocumentUploadIcon />}
            onClick={() => this.createPermit()}
          />
        </Box>
      </Box>
    )
  }
}

PermitCreate.propTypes = {
  accounts: PropTypes.object,
  PermitFactory: PropTypes.object,
  drizzleStatus: PropTypes.object,
  contracts: PropTypes.object,
  transactionStack: PropTypes.array,
  transactions: PropTypes.object
}

PermitCreate.contextTypes = {
  drizzle: PropTypes.object
}

export default PermitCreate
